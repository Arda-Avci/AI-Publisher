# Colab hücresine yapıştırın
from google.colab import files
uploaded = files.upload()  # karakter.wav seçin
import shutil
shutil.copy(list(uploaded.keys())[0], "/content/karakter.wav")
print("✅ Referans ses yüklendi!")
