import zipfile
import xml.etree.ElementTree as ET
import sys

def read_docx(path):
    with zipfile.ZipFile(path) as docx:
        tree = ET.fromstring(docx.read('word/document.xml'))
        namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
        text = []
        for paragraph in tree.findall('.//w:p', namespaces):
            para_text = []
            for node in paragraph.findall('.//w:t', namespaces):
                if node.text:
                    para_text.append(node.text)
            text.append(''.join(para_text))
        return '\n'.join(text)

print(read_docx(sys.argv[1]))
