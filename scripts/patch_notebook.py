import json
import os

notebook_path = "Google_Colab_AI_Publisher.ipynb"

if not os.path.exists(notebook_path):
    print(f"Error: {notebook_path} not found.")
    exit(1)

with open(notebook_path, "r", encoding="utf-8") as f:
    data = json.load(f)

patched = False
for cell in data.get("cells", []):
    if cell.get("cell_type") == "code":
        source = cell.get("source", [])
        
        has_docker_setup = False
        for line in source:
            if "docker-buildx" in line or "podman pigz" in line:
                has_docker_setup = True
                break
        
        if has_docker_setup:
            new_source = []
            skip_mode = False
            for line in source:
                if "# 2. Docker ve pigz Kurulumu" in line:
                    new_source.append('print("==========================================")\n')
                    new_source.append('print("⚠️ Google Colab Kısıtlamaları Nedeniyle Derleme Yerelleştirildi!")\n')
                    new_source.append('print("==========================================")\n')
                    new_source.append('print("Google Colab\'ın güncellenen kernel ve cgroup kısıtlamaları (read-only filesystem)")\n')
                    new_source.append('print("nedeniyle Docker/Podman derlemeleri Colab üzerinde teknik olarak engellenmektedir.")\n')
                    new_source.append('print("Bu yüzden kredilerinizin boşa gitmesini önlemek amacıyla derleme süreci tamamen")\n')
                    new_source.append('print("yerel bilgisayarınıza taşınmıştır.")\n')
                    new_source.append('print("")\n')
                    new_source.append('print("👉 ADIM ADIM YEREL DERLEME TALİMATI:")\n')
                    new_source.append('print("1. Yerel bilgisayarınızda Docker Desktop uygulamasının açık ve çalışır olduğundan emin olun.")\n')
                    new_source.append('print("2. Windows PowerShell terminalini açıp proje dizinine gidin:")\n')
                    new_source.append('print("   cd C:\\\\Users\\\\Damla\\\\Proje\\\\AI-Publisher")\n')
                    new_source.append('print("3. colab_docker/ klasöründeki yerel derleme betiğini çalıştırın:")\n')
                    new_source.append('print("   .\\\\colab_docker\\\\build_local.ps1")\n')
                    new_source.append('print("4. Bu betik sırayla tüm model imajlarını yerelde derleyecek, sıkıştıracak ve")\n')
                    new_source.append('print("   \'colab_docker/dist/\' klasörüne kaydedecektir (Colab kredilerinizden 0 harcama!).")\n')
                    new_source.append('print("5. Derleme bittiğinde, \'colab_docker/dist/\' içindeki 11 adet \'.tar.gz\' dosyasını")\n')
                    new_source.append('print("   Google Drive\'ınızdaki \'Colab Notebooks/docker/images/\' dizinine sürükleyip bırakarak yükleyin.")\n')
                    new_source.append('print("6. Yükleme tamamlandıktan sonra Colab sunucusunu (1. Hücre) normal şekilde başlatabilirsiniz.")\n')
                    new_source.append('print("==========================================")\n')
                    skip_mode = True
                    patched = True
                    continue
                
                if not skip_mode:
                    new_source.append(line)
            
            cell["source"] = new_source

if patched:
    with open(notebook_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print("Notebook successfully updated with runc patch integration.")
else:
    print("Docker setup cell not found in notebook.")
