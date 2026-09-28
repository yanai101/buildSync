import re

with open('src/components/UploadPlanModal.tsx', 'r') as f:
    content = f.read()

old_func = """  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      // Auto-fill name from file
      const nameWithoutExt = selectedFile.name.split('.').slice(0, -1).join('.');
      if (!name) {
        setName(nameWithoutExt);
      }
    }
  };"""

new_func = """  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      setFiles(selectedFiles);
      
      if (selectedFiles.length === 1) {
        const nameWithoutExt = selectedFiles[0].name.split('.').slice(0, -1).join('.');
        if (!name) setName(nameWithoutExt);
      }
    }
  };"""

content = content.replace(old_func, new_func)

with open('src/components/UploadPlanModal.tsx', 'w') as f:
    f.write(content)
