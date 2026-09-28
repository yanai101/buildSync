import re

with open('src/components/UploadPlanModal.tsx', 'r') as f:
    content = f.read()

# Change file state to files array
content = content.replace("const [file, setFile] = useState<File | null>(null);", "const [files, setFiles] = useState<File[]>([]);")

# Change handleFileChange
old_file_change = """  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      setFile(selected);
      
      const nameWithoutExt = selected.name.replace(/\.[^/.]+$/, "");
      if (!name) {
        setName(nameWithoutExt);
      }
    }
  };"""

new_file_change = """  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      
      if (selectedFiles.length === 1) {
        const nameWithoutExt = selectedFiles[0].name.replace(/\\.[^/.]+$/, "");
        if (!name) setName(nameWithoutExt);
      }
    }
  };"""
content = content.replace(old_file_change, new_file_change)

# Change handleUpload
old_handle_upload = """  const handleUpload = async () => {
    if (!file || !name) {
      notify({ kind: 'error', title: 'יש למלא שם ולבחור קובץ' });
      return;
    }
    try {
      setIsUploading(true);
      await uploadPlan({
        file,
        name,
        category,
        stageIds: stageIds as any,
        sharedWithContractorIds: sharedWithContractorIds as any,
        onProgress: setProgress
      });
      notify({ kind: 'success', title: 'התוכנית הועלתה בהצלחה' });
      onClose();
    } catch (err: any) {
      notify({ kind: 'error', title: err.message || 'שגיאה בהעלאת התוכנית' });
      setIsUploading(false);
    }
  };"""

new_handle_upload = """  const handleUpload = async () => {
    if (files.length === 0 || (files.length === 1 && !name)) {
      notify({ kind: 'error', title: 'יש לבחור קבצים (ושם לתוכנית)' });
      return;
    }
    try {
      setIsUploading(true);
      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        const currentFile = files[i];
        const planName = files.length === 1 ? name : currentFile.name.replace(/\\.[^/.]+$/, "");
        
        await uploadPlan({
          file: currentFile,
          name: planName,
          category,
          stageIds: stageIds as any,
          sharedWithContractorIds: sharedWithContractorIds as any,
          onProgress: (pct) => {
             const baseProgress = (i / files.length) * 100;
             const currentProgress = (pct / files.length);
             setProgress(baseProgress + currentProgress);
          }
        });
        successCount++;
      }
      notify({ kind: 'success', title: `הועלו ${successCount} תוכניות בהצלחה` });
      onClose();
    } catch (err: any) {
      notify({ kind: 'error', title: err.message || 'שגיאה בהעלאת התוכניות' });
      setIsUploading(false);
    }
  };"""
content = content.replace(old_handle_upload, new_handle_upload)

# Change File Input UI
old_input_ui = """          <label style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed var(--border)',
            borderRadius: 12,
            padding: 24,
            cursor: isUploading ? 'not-allowed' : 'pointer',
            background: file ? 'var(--accent-light)' : 'var(--surface-2)',
            transition: 'all 0.2s',
            opacity: isUploading ? 0.7 : 1
          }}>
            <Icon n={file ? "check-circle" : "upload-cloud"} s={32} c={file ? "var(--accent)" : "var(--text3)"} />
            <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text1)' }}>
              {file ? file.name : "לחץ לבחירת קובץ"}
            </div>
            {!file && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>עד 25MB</div>}
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              onChange={handleFileChange}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>"""

new_input_ui = """          <label style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px dashed var(--border)',
            borderRadius: 12,
            padding: 24,
            cursor: isUploading ? 'not-allowed' : 'pointer',
            background: files.length > 0 ? 'var(--accent-light)' : 'var(--surface-2)',
            transition: 'all 0.2s',
            opacity: isUploading ? 0.7 : 1
          }}>
            <Icon n={files.length > 0 ? "check-circle" : "upload-cloud"} s={32} c={files.length > 0 ? "var(--accent)" : "var(--text3)"} />
            <div style={{ marginTop: 12, fontWeight: 600, color: 'var(--text1)' }}>
              {files.length === 1 ? files[0].name : files.length > 1 ? `נבחרו ${files.length} קבצים` : "לחץ לבחירת קבצים"}
            </div>
            {files.length === 0 && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>ניתן לבחור מספר קבצים ביחד (עד 25MB לקובץ)</div>}
            <input 
              type="file" 
              multiple
              accept="image/*,application/pdf" 
              onChange={handleFileChange}
              disabled={isUploading}
              style={{ display: 'none' }}
            />
          </label>"""
content = content.replace(old_input_ui, new_input_ui)

# Change Name Input UI - hide if multiple
old_name_ui = """        <div>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>שם התוכנית</label>
          <Input 
            value={name} 
            onChange={(e: any) => setName(e.target.value)} 
            placeholder="לדוגמה: תוכנית אדריכלית קומת קרקע" 
            disabled={isUploading}
          />
        </div>"""

new_name_ui = """        {files.length <= 1 && (
          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 600, fontSize: 13, color: 'var(--text2)' }}>שם התוכנית</label>
            <Input 
              value={name} 
              onChange={(e: any) => setName(e.target.value)} 
              placeholder="לדוגמה: תוכנית אדריכלית קומת קרקע" 
              disabled={isUploading}
            />
          </div>
        )}
        {files.length > 1 && (
          <div style={{ fontSize: 13, color: 'var(--text3)', background: 'var(--surface-2)', padding: '8px 12px', borderRadius: 8 }}>
            💡 שמות התוכניות יוגדרו אוטומטית לפי שמות הקבצים המקוריים.
          </div>
        )}"""
content = content.replace(old_name_ui, new_name_ui)

# Change Button Logic
old_btn = "<Btn variant=\"primary\" onClick={handleUpload} disabled={isUploading || !file || !name}>"
new_btn = "<Btn variant=\"primary\" onClick={handleUpload} disabled={isUploading || files.length === 0 || (files.length === 1 && !name)}>"
content = content.replace(old_btn, new_btn)

with open('src/components/UploadPlanModal.tsx', 'w') as f:
    f.write(content)
