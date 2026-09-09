# WriteCheck TOEIC — bản deploy Vercel

Ứng dụng chấm & chữa TOEIC Writing, dữ liệu (đề thi + lịch sử làm bài) **dùng chung cho mọi người mở app** — phù hợp cho 2 người dùng như bạn dự tính.

## Vì sao cần các bước dưới đây

Bản chat demo trước chạy trong Claude.ai và dùng cơ chế lưu trữ + gọi API riêng của Claude.ai. Khi tự deploy lên Vercel, hai thứ đó không còn nữa, nên đã chuyển sang:
- **Lưu trữ dữ liệu**: Upstash Redis (free tier, đủ dùng cho quy mô nhỏ).
- **Chấm điểm**: gọi Google Gemini API (free tier, không cần thẻ thanh toán) từ server (API route `app/api/grade/route.js`), để không lộ key ra trình duyệt.

## Các bước deploy

### 1. Tạo database Upstash Redis (miễn phí)
1. Vào https://console.upstash.com → **Create Database** → chọn Redis, region gần bạn.
2. Vào tab **REST API** của database vừa tạo, copy `UPSTASH_REDIS_REST_URL` và `UPSTASH_REDIS_REST_TOKEN`.

### 2. Lấy Gemini API key (miễn phí)
Vào https://aistudio.google.com/apikey → **Create API key** → copy giá trị này làm `GEMINI_API_KEY`. Free tier hiện tại đủ dùng cho vài chục bài chấm/ngày, không cần khai báo thẻ thanh toán.

### 3. Đẩy code lên GitHub
```bash
cd toeic-writing-vercel
git init
git add .
git commit -m "init"
gh repo create toeic-writing-app --private --source=. --push
# (hoặc tạo repo thủ công trên GitHub rồi git remote add + push)
```

### 4. Deploy trên Vercel
1. Vào https://vercel.com/new, chọn import repo vừa tạo.
2. Ở bước cấu hình, thêm 3 biến môi trường (Settings → Environment Variables):
   - `GEMINI_API_KEY`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`
3. Bấm **Deploy**. Xong, cả 2 người dùng chung 1 URL sẽ thấy chung 1 kho đề + lịch sử.

### Chạy thử ở máy local (tuỳ chọn, trước khi deploy)
```bash
npm install
cp .env.example .env.local   # rồi điền giá trị thật vào .env.local
npm run dev
```
Mở http://localhost:3000

## Lưu ý quan trọng

- **Không có phân quyền/đăng nhập**: ai có URL cũng thấy và sửa được toàn bộ đề + lịch sử (đúng như bạn muốn — chia sẻ toàn bộ cho 2 người). Nếu sau này muốn giới hạn, cần thêm xác thực (ví dụ Vercel's built-in password protection, hoặc NextAuth).
- **Chi phí**: Upstash free tier, Vercel free tier, và Gemini free tier đều đủ dùng cho quy mô 2 người, vài chục bài chấm/ngày.
- **Model Gemini dùng trong `app/api/grade/route.js`** được đặt tên trong hằng số `MODEL` ở đầu file — nếu Google đổi tên/khai tử model free-tier hiện tại, chỉ cần sửa giá trị đó, không cần đổi gì khác.
- **Ảnh trong đề Phần 1** được resize/nén ở client trước khi lưu, nên rất nhẹ (dưới ~1MB/đề với 5 ảnh), an tâm về giới hạn dung lượng.
