# Thùy Linh & Đức Tuấn — Vintage Lace

Site public: https://linh-tuan-vintage-lace.ducnguyencuong77.chatgpt.site

Source độc lập với `../wedding-invitation`. Luồng khách: phong bì từ handoff → bìa thư mời ren → nội dung thiệp. Phần lịch và ảnh vòm để trơn, đã bỏ khung ren xanh.

## Các phần đã tích hợp từ handoff v29

- Phong bì dùng đúng ảnh nền xanh viền ren chữ V và con dấu T&L. Tên khách ở nắp; chạm con dấu để nắp trượt lên, thân trượt xuống rồi vào bìa thư mời hiện tại. Khóa cuộn và tương tác với nội dung phía sau trong lúc phong bì đóng.
- “Chuyện của chúng mình” là một section ảnh toàn màn hình trước album, thay cho caption ngắn trước đây. Bốn ảnh chuyển cảnh chéo trong chu kỳ 24 giây, chữ “Hai trái tim, một mái nhà” và nút “Xem lại phong bì”. Animation tạm dừng khi section ở ngoài màn hình; ưu tiên giảm chuyển động thì chỉ hiện một ảnh.
- Chỉ lấy hai phần này từ `Main.dc_1.html` và `wedding-invitation-handoff_1.md`; lịch, lời mời, RSVP và thông tin mừng cưới tiếp tục dùng nội dung hiện tại.

## Album 12 ảnh mới

Năm ảnh chính có các kích thước khác nhau, một ảnh dọc lớn ở giữa và bốn ảnh xung quanh. Trên điện thoại là bố cục hai cột. Bảy ảnh còn lại đặt ngay dưới trong carousel vuốt ngang, có nút trước/sau. Tất cả ảnh mở chung viewer có đếm ảnh, chú thích, nút trước/sau, phím mũi tên, Escape và vuốt ngang.

Ảnh chính: `4257`, `4465`, `4647`, `4099`, `4373`.
Carousel: `4214`, `4220`, `4566`, `3904`, `4366`, `4155`, `4450`.

Ảnh web ở `assets/photo-*.webp`, cạnh dài 1800px, WebP quality 82, bỏ metadata. File JPG gốc ở Downloads không thay đổi. Có thể tạo lại bằng:

```sh
bash scripts/prepare-photos.sh /absolute/path/to/original-photos
```

Cần `cwebp` cho bước chuẩn bị ảnh; chạy site không cần cài package. `assets/envelope.webp` và `assets/seal.webp` là bản tải từ tài sản gốc của handoff. `assets/album-2.jpg` đến `album-5.jpg` tiếp tục dùng riêng cho slideshow đúng theo handoff.

## Cá nhân hóa và chỉnh sửa

- `index.html`: cấu trúc, nội dung và lựa chọn ảnh.
- `styles.css`: phong bì, bìa, ảnh chuyển cảnh, collage, carousel và viewer.
- `script.js`: mở/đóng phong bì, đếm ngược, tên khách, gửi RSVP, nhạc và các tương tác album.

Tên khách lấy từ `?khach=Anh%20Nam` hoặc `?guest=Anh%20Nam`; mặc định “Quý khách”. Phong bì, lời mời và footer cùng dùng tên này. Sau khi gửi RSVP thành công, tên trên form cập nhật lời cảm ơn của phiên hiện tại. Không dùng localStorage.

## RSVP

POST JSON tới `/api/rsvp`, API kiểm tra và ghi vào D1 `rsvps`. Chỉ báo thành công sau khi máy chủ nhận. Không tự gửi email/SMS. Mỗi phản hồi gồm `id`, `name`, `attendance` (`both`, `party`, `ceremony`, `no`), `guests` (0 khi vắng mặt, 1–5 khi tham dự; 5 là từ 5 người), `note`, `created_at`. UUID giúp thử lại sau lỗi mạng không tạo bản trùng. Không có API public để liệt kê phản hồi; chủ site có thể yêu cầu Codex đọc qua Sites, binding `DB`, bảng `rsvps`.

Backend và migration không đổi trong lần tích hợp phong bì/album này. Không sửa migration đã áp dụng; thêm migration mới nếu thay đổi schema.

## Chạy và xuất bản

Node.js 23 trở lên cho preview SQLite, không cần dependencies.

```sh
npm run check
npm test
npm run build
npm run dev
```

Preview: http://127.0.0.1:5500/. Database preview trong `.preview/`, bị Git bỏ qua và tách khỏi dữ liệu cloud. Build nhúng HTML/CSS/JS và ảnh vào Worker ESM ở `dist/server/index.js`. `.openai/hosting.json` giữ Site ID, D1 `DB`; publish lại cùng site, giữ access `public`.

## Kiểm tra

Đã mở phong bì có tên khách để vào đúng bìa, kiểm tra mở lại từ câu chuyện, đủ 4 ảnh slideshow, 5 ảnh chính và 7 ảnh carousel, ảnh tải thành công, carousel cuộn, viewer chuyển bằng nút/phím mũi tên và đóng bằng Escape. Đã xem desktop 1280px và mobile 390px; không tràn ngang. Đã bỏ asset và markup của khung ren xanh.

Sáu kiểm thử API đã pass ở lần triển khai backend trước; backend không đổi. Không tạo RSVP kiểm thử trên production.
