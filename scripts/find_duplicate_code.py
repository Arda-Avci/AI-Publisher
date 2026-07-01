#!/usr/bin/env python3
import os
import re
import hashlib
import argparse
from collections import defaultdict

def load_and_clean_file(filepath):
    cleaned = []
    try:
        with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
            lines = f.readlines()
    except Exception as e:
        print(f"[WARN] Dosya okunamadı: {filepath}. Hata: {e}")
        return []
    
    in_block_comment = False
    for idx, line in enumerate(lines):
        line_no = idx + 1
        raw_line = line.rstrip('\n')
        stripped = raw_line.strip()
        
        # Çok satırlı yorum satırları takibi (/* ... */)
        if '/*' in stripped:
            if '*/' not in stripped:
                in_block_comment = True
                continue
            else:
                stripped = re.sub(r'/\*.*?\*/', '', stripped).strip()
        elif '*/' in stripped:
            in_block_comment = False
            continue
            
        if in_block_comment:
            continue
            
        # Tek satırlı yorumlar
        if stripped.startswith('//') or stripped.startswith('#'):
            continue
            
        # Satır sonundaki yorumları temizle
        if '//' in stripped:
            stripped = re.sub(r'\s*//.*$', '', stripped).strip()
        if filepath.endswith('.py') and '#' in stripped:
            stripped = re.sub(r'\s*#.*$', '', stripped).strip()
            
        # Boş satırlar
        if not stripped:
            continue
            
        # Boşlukları tamamen kaldırarak normalleştir
        normalized = re.sub(r'\s+', '', stripped)
        
        cleaned.append({
            "orig_line": line_no,
            "raw_line": raw_line,
            "content": normalized
        })
    return cleaned

def find_duplicates(files, min_lines):
    file_contents = {}
    file_windows = {}
    W = min_lines
    
    print("[INFO] Dosyalar yükleniyor ve pencereler hash'leniyor...")
    for filepath in files:
        cleaned = load_and_clean_file(filepath)
        if len(cleaned) >= W:
            file_contents[filepath] = cleaned
            
            # Pencereleri oluştur ve hash'le
            windows = []
            for i in range(len(cleaned) - W + 1):
                window_content = "".join([cleaned[i + k]["content"] for k in range(W)])
                window_hash = hashlib.md5(window_content.encode('utf-8')).hexdigest()
                windows.append({
                    "start_idx": i,
                    "hash": window_hash
                })
            file_windows[filepath] = windows
            
    # Hash çakışmalarını haritala
    hash_to_locs = defaultdict(list)
    for filepath, windows in file_windows.items():
        for win in windows:
            hash_to_locs[win["hash"]].append((filepath, win["start_idx"]))
            
    # Eşleşmeleri çiftler halinde topla
    print("[INFO] Çakışan pencereler analiz ediliyor...")
    pair_matches = defaultdict(list)
    for w_hash, locs in hash_to_locs.items():
        if len(locs) < 2:
            continue
        # Kombinasyonları çıkar
        for idx_a in range(len(locs)):
            file_a, start_a = locs[idx_a]
            for idx_b in range(idx_a + 1, len(locs)):
                file_b, start_b = locs[idx_b]
                
                # Standartlaştır (aynı çifti çift taraflı yazmamak için)
                if file_a > file_b:
                    pair_matches[(file_b, file_a)].append((start_b, start_a))
                else:
                    pair_matches[(file_a, file_b)].append((start_a, start_b))
                    
    # Ardışık pencereleri köşegen bazlı birleştir
    print("[INFO] Eşleşmeler birleştiriliyor (diagonal merging)...")
    merged_blocks = []
    
    for (file_a, file_b), matches in pair_matches.items():
        # Köşegene göre grupla (offset = start_a - start_b)
        offset_groups = defaultdict(list)
        for sa, sb in matches:
            offset = sa - sb
            offset_groups[offset].append((sa, sb))
            
        for offset, group in offset_groups.items():
            # sa'ya göre sırala
            group.sort(key=lambda x: x[0])
            
            current_sa, current_sb = group[0]
            current_len = W
            
            for next_sa, next_sb in group[1:]:
                # Eğer ardışıksa (başlangıç satır farkı mevcut uzunluğa eşit veya küçükse)
                # Küçük olması üst üste binmeleri (overlap) tolare eder
                diff = next_sa - current_sa
                if diff <= (current_len - W + 1):
                    # Genişlet
                    current_len = diff + W
                else:
                    # Eski bloğu kaydet
                    merged_blocks.append({
                        "file_a": file_a,
                        "start_idx_a": current_sa,
                        "file_b": file_b,
                        "start_idx_b": current_sb,
                        "length_lines": current_len
                    })
                    current_sa, current_sb = next_sa, next_sb
                    current_len = W
                    
            # Son kalanı kaydet
            merged_blocks.append({
                "file_a": file_a,
                "start_idx_a": current_sa,
                "file_b": file_b,
                "start_idx_b": current_sb,
                "length_lines": current_len
            })
            
    # Sonuçları zenginleştir (orijinal satırları ve kod örneklerini al)
    duplicates = []
    for block in merged_blocks:
        file_a = block["file_a"]
        file_b = block["file_b"]
        sa = block["start_idx_a"]
        sb = block["start_idx_b"]
        length = block["length_lines"]
        
        L_A = file_contents[file_a]
        L_B = file_contents[file_b]
        
        # Orijinal satır sınırları
        start_line_a = L_A[sa]["orig_line"]
        end_line_a = L_A[sa + length - 1]["orig_line"]
        start_line_b = L_B[sb]["orig_line"]
        end_line_b = L_B[sb + length - 1]["orig_line"]
        
        # Kod örneği
        sample_lines = [L_A[idx]["raw_line"] for idx in range(sa, sa + length)]
        
        duplicates.append({
            "file_a": file_a,
            "start_line_a": start_line_a,
            "end_line_a": end_line_a,
            "file_b": file_b,
            "start_line_b": start_line_b,
            "end_line_b": end_line_b,
            "length_lines": length,
            "sample": "\n".join(sample_lines)
        })
        
    duplicates.sort(key=lambda x: x["length_lines"], reverse=True)
    return duplicates

def main():
    parser = argparse.ArgumentParser(description="Projedeki tekrar eden kod bloklarını bulur.")
    parser.add_argument("--dir", default="src", help="Taranacak hedef dizin (varsayılan: src)")
    parser.add_argument("--min-lines", type=int, default=10, help="Minimum tekrar eden satır sayısı (varsayılan: 10)")
    parser.add_argument("--output", default="duplicate_report.md", help="Raporun yazılacağı dosya adı")
    args = parser.parse_args()
    
    target_dir = os.path.abspath(args.dir)
    if not os.path.exists(target_dir):
        print(f"[ERROR] Belirtilen dizin bulunamadı: {target_dir}")
        return
        
    print(f"[INFO] Taranacak dizin: {target_dir}")
    print(f"[INFO] Minimum satır eşiği: {args.min_lines}")
    
    files_to_scan = []
    exclude_dirs = {"node_modules", "dist", "build", "outputs", "tmp", ".git"}
    valid_exts = {".ts", ".tsx", ".js", ".py"}
    
    for root, dirs, files in os.walk(target_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            ext = os.path.splitext(file)[1]
            if ext in valid_exts:
                files_to_scan.append(os.path.join(root, file))
                
    print(f"[INFO] Toplam {len(files_to_scan)} kod dosyası taramaya dahil edilecek.")
    
    duplicates = find_duplicates(files_to_scan, args.min_lines)
    
    # Raporu Markdown formatında oluştur
    output_path = os.path.join(os.getcwd(), args.output)
    
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(f"# Kod Tekrarları Analiz Raporu\n\n")
        f.write(f"- **Taranan Dizin**: `{args.dir}`\n")
        f.write(f"- **Minimum Eşleşen Satır Sayısı**: `{args.min_lines}`\n")
        f.write(f"- **Bulunan Tekrar Sayısı**: `{len(duplicates)}`\n\n")
        
        if not duplicates:
            f.write("Tebrikler! Belirtilen kriterlere göre hiç tekrar eden kod bloğu bulunamadı.\n")
        else:
            f.write("## Tekrar Eden Blokların Listesi\n\n")
            for idx, dup in enumerate(duplicates[:50]): # İlk 50 çakışmayı listele
                file_a_rel = os.path.relpath(dup["file_a"], os.getcwd()).replace("\\", "/")
                file_b_rel = os.path.relpath(dup["file_b"], os.getcwd()).replace("\\", "/")
                
                f.write(f"### {idx+1}. Tekrar Bloğu ({dup['length_lines']} Satır)\n")
                f.write(f"- **Dosya A**: [{file_a_rel} (Satır {dup['start_line_a']}-{dup['end_line_a']})](file:///{dup['file_a']}#L{dup['start_line_a']}-L{dup['end_line_a']})\n")
                f.write(f"- **Dosya B**: [{file_b_rel} (Satır {dup['start_line_b']}-{dup['end_line_b']})](file:///{dup['file_b']}#L{dup['start_line_b']}-L{dup['end_line_b']})\n\n")
                f.write("```typescript\n")
                f.write(dup["sample"])
                f.write("\n```\n\n")
                f.write("---\n\n")
                
            if len(duplicates) > 50:
                f.write(f"\n*Not: Toplam {len(duplicates)} adet tekrar bulundu. Sadece ilk 50 tanesi listelenmiştir.*\n")
                
    print(f"[SUCCESS] Analiz tamamlandı. Rapor yazıldı: {output_path}")

if __name__ == "__main__":
    main()
