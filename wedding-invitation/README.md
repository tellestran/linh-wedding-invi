# Thiệp cưới Thùy Linh & Đức Tuấn

HTML/CSS/JavaScript thuần, dựng theo `wedding-invitation-handoff.md` và `Main.dc.html` mới nhất. Hai bố cục dùng chung source: một cột trên điện thoại, lưới rộng tối đa 1180px và menu cố định từ 900px. Website giữ quyền xem công khai, không yêu cầu đăng nhập ChatGPT.

## Mở và chỉnh nội dung

Mở `dist/index.html` bằng trình duyệt, hoặc chạy `npm run dev` rồi vào `http://127.0.0.1:4173`. Không cần cài dependencies hay build; máy chủ xem thử dùng Python 3. Google Fonts cần kết nối internet. `npm run check` kiểm tra cú pháp JavaScript.

- `dist/index.html`: tên cô dâu/chú rể, hai gia đình, lịch trình, giờ tiệc, hạn RSVP và số điện thoại. Các mục chưa có thông tin vẫn nằm trong dấu ngoặc vuông.
- `dist/script.js`: `WEDDING_DATE`, `ADDRESS`, `PHOTO_PATH`, `ALBUM_PHOTOS`, `GIFT_ACCOUNTS`, `RSVP_ENDPOINT` ở đầu file.
- `dist/style.css`: CSS từ mẫu và phần bổ sung cho trạng thái DOM, accessibility, mobile và reduced motion ở cuối.
- `dist/assets/couple.jpg`: ảnh từ `YAGG4566.jpg`, tối ưu chiều cao 1500px, dưới 300 KB. EXIF/XMP/IPTC được gỡ khỏi bản dùng trên web; file gốc không đổi.

Hôn lễ: 09:00 ngày 29.11.2026. Tiệc chung vui: 27.11.2026, giờ chờ cập nhật. Địa chỉ **21 Hưng Thọ, Phường Quảng Phú, Thanh Hóa** đã được chủ thiệp xác nhận trong chat. Khi đổi ngày hoặc địa chỉ, sửa cả nội dung in trong HTML và hằng số tương ứng trong JavaScript.

## Cá nhân hóa và ảnh album

Thêm `?khach=Anh%20Nam` hoặc `?guest=Anh%20Nam` vào link để hiện tên người được mời. Tên được trim, giới hạn 60 ký tự và chèn bằng `textContent`. Không có tham số thì ẩn dòng tên khách.

Ảnh chính dùng trong khung oval, album và lightbox. Để thêm ảnh: chép ảnh vào `dist/assets/`, điền đường dẫn như `'./assets/album-2.jpg'` vào từng ô trong `ALBUM_PHOTOS`. Ô trống giữ nhãn “Ảnh sắp cập nhật”. Ảnh được mở bằng dialog, hỗ trợ Escape, nút đóng và bấm nền, rồi trả focus về ảnh đã chọn.

## RSVP và kết nối dịch vụ

Để trống `RSVP_ENDPOINT` thì chỉ hiện lời cảm ơn của bản xem thử; không gửi và không lưu thông tin khách. Giao diện ghi rõ điều này. Điền endpoint HTTPS nhận POST JSON sau để thu xác nhận thật:

```json
{ "name": "Nguyễn Văn Nam", "attendance": "both", "guests": 2, "note": "Lời chúc" }
```

`attendance`: `both`, `tiec`, `honle`, `no`. Khi không tham dự, `guests` bằng 0. Giá trị 5 trong danh sách nghĩa là 5 người trở lên.

Formspree hoặc endpoint riêng: cấu hình nhận JSON, cho phép CORS từ tên miền website, và trả HTTP 2xx sau khi đã nhận dữ liệu. Chỉ khi thành công trang mới hiện xác nhận thật. Khi gửi lỗi hoặc quá 12 giây, thông tin được giữ để khách thử lại; không có secret trong frontend.

Google Sheets: dùng một endpoint phía máy chủ nhận cấu trúc trên rồi ghi vào Sheets, hoặc chuyển tiếp sang Apps Script đã được cấp quyền ghi bảng. Không đặt khóa dịch vụ Google trong JavaScript. Cấu hình CORS và thử POST từ website đã host; nếu Apps Script không đáp ứng được preflight JSON, dùng một endpoint trung gian. Chưa kết nối dịch vụ thật trong bản này.

## Mừng cưới

Điền `bank`, `account`, `qr` cho cô dâu/chú rể trong `GIFT_ACCOUNTS`. `qr` là đường dẫn ảnh, ví dụ `'./assets/qr-co-dau.png'`. Khi chưa có số tài khoản, nút sao chép bị vô hiệu hóa. QR đang là placeholder có nhãn, không phải mã thanh toán thật. Thông tin ngân hàng và số tài khoản luôn hiển thị bằng text.

## Deploy

Toàn bộ website nằm trong `dist/`, deploy nguyên thư mục, không có build command:

- Netlify: kéo thả `dist/` vào manual deploy.
- GitHub Pages: chép nội dung `dist/` vào root của nhánh Pages, chọn nhánh đó với `/ (root)`.
- Sites: giữ project ID trong `.openai/hosting.json`, cập nhật cùng URL và giữ quyền xem public.

## Kiểm tra

Đã kiểm tra trên HTTP preview: mở seal, khóa/mở cuộn, dấu tiếng Việt, ảnh thật và lightbox/Escape/focus, tên khách, RSVP tham dự/từ chối/chỉnh sửa, sao chép địa chỉ. Bố cục 360px, 1280px và 1440px không tràn ngang; nhánh giảm chuyển động được kiểm tra bằng fixture riêng. Asset, SVG reference, ID HTML và cú pháp JavaScript đã được kiểm tra.

Chưa đo Lighthouse hoặc kiểm tra trên thiết bị iOS thực tế. Trình duyệt trong app chặn `file://`, nên mở file trực tiếp chưa được kiểm thử tại đây. Endpoint thu RSVP thật, ngân hàng, giờ tiệc, hạn trả lời, số điện thoại và các ảnh album bổ sung vẫn cần cấu hình.
