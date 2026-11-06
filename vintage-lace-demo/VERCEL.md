# Vercel: tra tên khách và gửi RSVP qua Google Sheets

## 1. Cập nhật Apps Script

Dán nội dung `integrations/google-apps-script/Code.gs` vào Apps Script của Sheet đang dùng. Chạy `checkSetup` để kiểm tra cấu hình mà không ghi RSVP.

Script Properties phải có `SPREADSHEET_ID` và `GUEST_LOOKUP_SECRET`. Giữ nguyên secret đã cấu hình; secret trên Vercel phải giống hệt.

Các tab phải có hàng tiêu đề đúng thứ tự:

| Tab | Các cột |
| --- | --- |
| KhachMoi | id, Tên |
| PhanHoi | guest_id, name, attendance, guests, updated_at, submission_id |
| LoiChuc | wish_id, guest_id, name, wish, created_at |

ID là số nguyên dương từ 1 đến 999999999, không có số 0 ở đầu và không trùng. Ví dụ `1` tương ứng `Anh Nam`.

Chọn **Deploy → Manage deployments → Edit → New version → Deploy**. Web app chạy bằng tài khoản chủ Sheet, quyền truy cập **Anyone**. Giữ URL `/exec` hiện tại. Mở URL này sẽ thấy `version: 2`; chỉ lưu code chưa cập nhật deployment.

## 2. Cấu hình project Vercel

Push các thay đổi mới lên Git trước. Import repository vào Vercel, hoặc sửa project đã import:

| Thiết lập | Giá trị |
| --- | --- |
| Root Directory | `vintage-lace-demo` |
| Framework Preset | Other |
| Build Command | `npm run build:vercel` |
| Output Directory | `public` |
| Install Command | Mặc định |

File `vercel.json` đã khai báo build và output. Không dùng `dist/server` làm output trên Vercel. Hai Vercel Functions nằm ở `api/guest.js` và `api/rsvp.js`.

Trong **Settings → Environment Variables**, thêm cho Production và Preview:

| Biến | Giá trị |
| --- | --- |
| GUEST_LOOKUP_URL | URL Apps Script kết thúc bằng `/exec` |
| GUEST_LOOKUP_SECRET | Cùng secret trong Script Properties |

Chọn **Deploy**, hoặc **Redeploy** sau khi đổi biến môi trường. Không cần D1 hoặc database Vercel.

## 3. Kiểm tra

Mở `https://TEN-SITE.vercel.app/?id=1` với một ID có trong `KhachMoi`. Tên trong phong bì và lời mời phải đổi theo Sheet. API `/api/guest?id=1` chỉ trả tên của khách đó.

Gửi một RSVP thật và kiểm tra `PhanHoi`; lời chúc không rỗng được lưu ở `LoiChuc`. Cùng UUID gửi lại sẽ không thêm bản ghi trùng. Khi khách sửa thông tin rồi gửi lại, phản hồi mới thay phản hồi hiện tại của ID đó. Không có ID thì mỗi lần gửi mới là một phản hồi riêng; retry cùng UUID vẫn được khử trùng.

Tên khách có ID được tra lại từ Sheet ở server khi lưu. `id` trong URL là ID khách; `id` trong JSON RSVP là UUID chống ghi trùng, còn `guest_id` mới là ID khách.

## 4. Chạy local

Điền URL và secret vào `.env.local` theo `.env.example`. File này bị Git bỏ qua và chỉ server đọc.

```sh
cd vintage-lace-demo
npm run build
npm run dev
```

Mở `http://127.0.0.1:5500/?id=1`. `npm run dev` tự nạp `.env.local`. Live Server hoặc Python static server chỉ phục vụ giao diện, không chạy hai API.

Khi có cấu hình Google, local gửi vào Sheet thật. Khi không có cả hai biến, bản preview dùng SQLite cục bộ để thử giao diện RSVP; trên Vercel luôn yêu cầu cấu hình Google và không báo thành công nếu chưa lưu được.

## Nếu lỗi

- `503` khi tra tên hoặc gửi: kiểm tra hai biến môi trường, secret và quyền Anyone; Redeploy sau khi đổi biến trên Vercel.
- URL `/exec` trả HTML đăng nhập: kiểm tra quyền truy cập web app.
- Không thấy `version: 2`: cập nhật New version cho deployment Apps Script.
- ID không tồn tại: kiểm tra cột `id` trong `KhachMoi`; ID lỗi không được ghi RSVP.
- Sheet sai tên tab hoặc tiêu đề: chạy `checkSetup` trong Apps Script.

Tài liệu chính thức: [Vercel Functions](https://vercel.com/docs/functions/functions-api-reference), [Environment Variables](https://vercel.com/docs/environment-variables), [Apps Script Web Apps](https://developers.google.com/apps-script/guides/web).
