# Kế hoạch tích hợp AntStudio với Google Cloud Agent (Vertex AI)

Kế hoạch này nhằm mục đích biến **AntStudio** thành một hệ thống AI Streamer thông minh, được điều khiển bởi **Google Cloud Agent** (Vertex AI Agent Builder). Hệ thống sẽ có khả năng tương tác hội thoại tự nhiên, tra cứu tri thức sản phẩm và tự động điều khiển giao diện livestream.

## Tổng quan kiến trúc
1. **AntStudio Backend:** Đóng vai trò là "Cơ quan đầu não" cung cấp các công cụ (Tools) và dữ liệu tri thức.
2. **Google Cloud Agent:** Đóng vai trò là "Người streamer" xử lý hội thoại và ra quyết định.
3. **Socket.io:** Kênh truyền tin thời gian thực để đồng bộ trạng thái giữa Agent và giao diện người dùng.

---

## Các thành phần thay đổi

### 1. Chuẩn hóa API (OpenAPI Specification)
Để Agent có thể sử dụng các tính năng của AntStudio, cần cung cấp một bản mô tả API chuẩn.

#### [NEW] [openapi.ts](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/server/src/routes/openapi.ts)
* Tạo route mới để trả về file JSON/YAML chuẩn OpenAPI 3.0.
* Định nghĩa các công cụ quan trọng:
    * `generate-video`: Agent có thể yêu cầu tạo video sản phẩm.
    * `extract-product`: Agent có thể lấy thông tin sản phẩm từ URL.
    * `get-product-details`: Agent tra cứu giá, tồn kho, tính năng.

### 2. Dịch vụ cung cấp tri thức (Knowledge Service)
Thay vì sử dụng Vertex AI Search Data Stores, AntStudio sẽ đóng vai trò là nguồn cung cấp dữ liệu trực tiếp cho Agent thông qua các công cụ (Tools).

#### [NEW] [GCPIntegrationService.ts](file:///d:/Workspace/Gits/CamHub\ams\AntStudio/server/src/src/services/ai/GCPIntegrationService.ts)
* **Cơ chế hoạt động:** Cung cấp các hàm công cụ để Agent gọi khi cần thông tin về sản phẩm.
* **Thu thập dữ liệu:** Khi Agent yêu cầu, service này sẽ truy cập `inventoryUrl` để thu thập thông tin mới nhất (Crawl/Scrape) bao gồm chi tiết sản phẩm, comments và Q&A.
* **Lưu trữ:** Tiếp tục sử dụng **S3** để lưu trữ các tài liệu hoặc hình ảnh liên quan đến sản phẩm thay vì chuyển sang Google Cloud Storage.
* **Phản hồi:** Trả về dữ liệu văn bản đã được tinh lọc để Agent có thể hiểu và trả lời khách hàng ngay lập tức.

### 3. Điều khiển Livestream thời gian thực
Khi Agent đưa ra câu trả lời cho khách hàng, Studio cần cập nhật giao diện tương ứng.

#### [MODIFY] [webhooks.ts](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/server/src/routes/webhooks.ts)
* Thêm endpoint nhận sự kiện (Fullfillment) từ Google Cloud Agent.
* Phát tín hiệu qua Socket.io khi Agent nhắc đến sản phẩm hoặc sự kiện (Flash sale, v.v.).

#### [NEW] [useAgentSync.ts](file:///d:/Workspace/Gits/CamHub/ams/AntStudio/client/src/composables/studio/useAgentSync.ts)
* Composable phía Frontend để lắng nghe các lệnh từ Agent.
* Tự động hiển thị mã QR, đổi background hoặc nhân vật khi Agent yêu cầu.

---

## Lộ trình triển khai (TODO List)

### Giai đoạn 1: Thiết lập hạ tầng GCP
- [ ] Tạo Service Account với quyền `Vertex AI User`.
- [ ] Cấu hình biến môi trường trong `.env` (`GCP_PROJECT_ID`, `GCP_LOCATION`).
- [ ] Đảm bảo cấu hình S3 (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, v.v.) hoạt động ổn định.

### Giai đoạn 2: Phát triển Backend (AntStudio)
- [x] Triển khai `openapi.ts` và kiểm tra Swagger UI.
- [x] Triển khai `GCPIntegrationService.ts` để đồng bộ sản phẩm mẫu.
- [x] Viết API Webhook xử lý các yêu cầu từ Agent (`GoogleAgentController.executeAction`).

### Giai đoạn 3: Cấu hình Agent Builder
- [ ] Tạo Agent trên Vertex AI Agent Builder.
- [ ] Import OpenAPI từ AntStudio Backend.
- [ ] Thiết lập Playbook và Instructions cho Agent.

### Giai đoạn 4: Tích hợp Frontend & Kiểm thử
- [x] Triển khai lắng nghe sự kiện (`useAgentSync.ts` / logic inline) trong `SaleStudioV2.vue`.
- [ ] Chạy thử nghiệm livestream với Agent điều khiển hoàn toàn.

---

## Kế hoạch xác minh (Verification Plan)

### Kiểm thử API & Công cụ
- [ ] Sử dụng Postman để kiểm tra tính hợp lệ của file OpenAPI.
- [ ] Sử dụng Tool Console của Vertex AI để giả lập việc gọi API từ Agent.

### Kiểm thử hệ thống (End-to-End)
- [ ] **Kịch bản 1:** Khách hỏi giá sản phẩm A -> Agent trả lời và Studio hiện mã QR sản phẩm A.
- [ ] **Kịch bản 2:** Khách yêu cầu "Cho tôi xem video dùng thử" -> Agent gọi API dựng video và phát trên màn hình live.
- [ ] **Kịch bản 3:** Thay đổi giá sản phẩm trên Dashboard -> Agent cập nhật thông tin giá mới sau 1 phút.

### Hiệu năng
- [ ] Đảm bảo thời gian phản hồi từ lúc Agent nói đến lúc Studio cập nhật UI < 1 giây.
