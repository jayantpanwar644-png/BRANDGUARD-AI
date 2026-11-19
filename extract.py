with open('warp-carousel-bundle.html', 'r', encoding='utf-8') as f:
    text = f.read()

target = 'WarpCarousel'
pos = text.find(target)
print('Pos:', pos)
if pos != -1:
    with open('extracted_warp.js', 'w', encoding='utf-8') as out:
        out.write(text[max(0, pos-25000):min(len(text), pos+1000)])
    print('Extracted successfully!')
