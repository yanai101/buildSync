import re

with open('src/components/UploadPlanModal.tsx', 'r') as f:
    content = f.read()

old_bar = '<ProgressBar progress={progress} label="מעלה קובץ..." />'
new_bar = """<div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6, fontWeight: 600 }}>מעלה... {Math.round(progress)}%</div>
            <ProgressBar value={progress} height={8} color="var(--accent)" />"""

content = content.replace(old_bar, new_bar)

with open('src/components/UploadPlanModal.tsx', 'w') as f:
    f.write(content)
