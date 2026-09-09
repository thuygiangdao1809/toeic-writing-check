# WriteCheck TOEIC — bản deploy Vercel

Ứng dụng chấm & chữa TOEIC Writing, dữ liệu (đề thi + lịch sử làm bài) **dùng chung cho mọi người mở app** — phù hợp cho 2 người dùng như bạn dự tính.

## Vì sao cần các bước dưới đây

Bản chat demo trước chạy trong Claude.ai và dùng cơ chế lưu trữ + gọi API riêng của Claude.ai. Khi tự deploy lên Vercel, hai thứ đó không còn nữa, nên đã chuyển sang:
- **Lưu trữ dữ liệu**: Vercel Blob — kho lưu trữ có sẵn ngay trong tài khoản Vercel của bạn, không cần đăng ký hay xin API key ở dịch vụ ngoài nào cả.
- **Chấm điểm**: gọi Google Gemini API (free tier, không cần thẻ thanh toán) từ server (API route `app/api/grade/route.js`), để không lộ key ra trình duyệt.

## Các bước deploy

### 1. Lấy Gemini API key (miễn phí)
Vào https://aistudio.google.com/apikey → **Create API key** → copy giá trị này làm `GEMINI_API_KEY`. Free tier hiện tại đủ dùng cho vài chục bài chấm/ngày, không cần khai báo thẻ thanh toán.

### 2. Đẩy code lên GitHub
```bash
cd toeic-writing-vercel
git init
git add .
git commit -m "init"
gh repo create toeic-writing-app --private --source=. --push
# (hoặc tạo repo thủ công trên GitHub rồi git remote add + push)
```

### 3. Deploy trên Vercel
1. Vào https://vercel.com/new, chọn import repo vừa tạo.
2. Thêm 1 biến môi trường (Settings → Environment Variables): `GEMINI_API_KEY`.
3. Bấm **Deploy**.

### 4. Bật Vercel Blob cho project (không cần tài khoản ngoài)
1. Trong project vừa deploy trên Vercel, vào tab **Storage** → **Create Database** → chọn **Blob**.
2. Đặt tên tuỳ ý rồi bấm **Create** — Vercel sẽ tự hỏi có muốn **Connect** store này vào project hiện tại không, chọn **Connect**.
3. Vercel tự động thêm biến `BLOB_READ_WRITE_TOKEN` vào project cho cả 3 environment (Production/Preview/Development) — bạn **không cần** tự tay copy/paste gì cả.
4. Vào tab **Deployments** → bấm **Redeploy** ở bản deploy mới nhất để bản đang chạy nạp được biến `BLOB_READ_WRITE_TOKEN` vừa thêm (Vercel không tự áp dụng biến môi trường mới cho deployment đã build trước đó).

Xong bước này, cả 2 người dùng chung 1 URL sẽ thấy chung 1 kho đề + lịch sử.

### Chạy thử ở máy local (tuỳ chọn, trước khi deploy)
```bash
npm install
vercel link                 # liên kết thư mục này với project trên Vercel
vercel env pull .env.local  # tải GEMINI_API_KEY + BLOB_READ_WRITE_TOKEN thật về máy
npm run dev
```
Mở http://localhost:3000

## Lưu ý quan trọng

- **Không có phân quyền/đăng nhập**: ai có URL cũng thấy và sửa được toàn bộ đề + lịch sử (đúng như bạn muốn — chia sẻ toàn bộ cho 2 người). Nếu sau này muốn giới hạn, cần thêm xác thực (ví dụ Vercel's built-in password protection, hoặc NextAuth).
- **Vercel Blob lưu public theo URL**: mỗi đề/lịch sử được lưu thành 1 file JSON có URL công khai (không đăng nhập vẫn đọc được nếu có đúng URL). URL này không hiển thị hay được index ở đâu, nên trên thực tế mức riêng tư tương đương với việc "ai có link app cũng xem được toàn bộ" mà bạn đã chấp nhận — chỉ là kém riêng tư hơn một chút so với dữ liệu chỉ nằm sau server route như bản Redis cũ.
- **Chi phí**: Vercel Blob, Vercel free tier, và Gemini free tier đều đủ dùng cho quy mô 2 người, vài chục bài chấm/ngày. Vercel Blob free tier (gói Hobby) có hạn mức dung lượng + số lượt đọc/ghi mỗi tháng, xem chi tiết tại https://vercel.com/docs/vercel-blob nếu cần biết chính xác hạn mức hiện tại.
- **Model Gemini dùng trong `app/api/grade/route.js`** được đặt tên trong hằng số `MODEL` ở đầu file — nếu Google đổi tên/khai tử model free-tier hiện tại, chỉ cần sửa giá trị đó, không cần đổi gì khác.
- **Ảnh trong đề Phần 1** được resize/nén ở client trước khi lưu, nên rất nhẹ (dưới ~1MB/đề với 5 ảnh), an tâm về giới hạn dung lượng.
