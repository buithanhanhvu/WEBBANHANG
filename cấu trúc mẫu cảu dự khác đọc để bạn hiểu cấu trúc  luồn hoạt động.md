# SimpleBlog API - Cau truc thu muc va vai tro tung phan

## 1) Cau truc tong the (thu muc goc)

- `pom.xml`
  - File cau hinh Maven: ten project, dependencies, plugin build.
  - Khi tao project moi, thuong copy va chinh lai file nay de giu stack ky thuat.

- `src`
  - Chua toan bo source code ung dung va cau hinh runtime.
  - Gom 2 nhanh: `main` (code chay that) va `test` (test).

- `target`
  - Thu muc output khi build Maven (`.class`, artifact, resources da copy).
  - Khong chinh sua truc tiep; Maven tu sinh lai.

- `.github`
  - Chua script/hook cho CI, automation.
  - Thuong phuc vu pipeline, khong chua business logic API.

- `.idea`, `.vscode`
  - Cau hinh IDE (IntelliJ / VS Code).
  - Khong chua logic he thong.

- `create-database.sql`
  - Script SQL khoi tao database/schema.
  - Dung khi setup moi truong DB.

- `docker-compose.yml`
  - Dung de dung nhanh moi truong local bang Docker (DB va cac service lien quan).

- `README.md`
  - Tai lieu huong dan setup/chay project.

---

## 2) `src/main` - code chay chinh

### 2.1) `src/main/java/com/example/simpleblog`

- `SimpleBlogApiApplication.java`
  - Entry point cua Spring Boot (`main` method).
  - App bat dau khoi dong tu day.

- `common/ApiResponse.java`
  - Mau response chung de API tra ve thong nhat.
  - Controller thuong wrap du lieu tra ve trong `ApiResponse`.

### 2.2) `config/`

- `AppConfig.java`
  - Noi khai bao bean dung chung toan he thong.
  - Vi du: mapper, encoder, utility beans...

- `DataInitializer.java`
  - Khoi tao/seed du lieu ban dau luc app start.
  - Vi du: role mac dinh, admin mac dinh, du lieu mau.

### 2.3) `security/`

- `SecurityConfig.java`
  - Cau hinh Spring Security.
  - Xac dinh endpoint nao public, endpoint nao can login, endpoint nao can role admin.
  - Dang ky filter JWT.

- `JwtService.java`
  - Tao, parse, validate JWT token.
  - Lay thong tin user tu token.

- `JwtAuthenticationFilter.java`
  - Doc token tu request header.
  - Validate token va set `Authentication` vao SecurityContext.

- `CustomUserDetailsService.java`
  - Load user tu DB cho Spring Security.
  - Cau noi giua user data va co che xac thuc cua Spring.

### 2.4) `domain/` (entity, enum)

- `AppUser.java`: entity user.
- `Role.java`: entity role.
- `RoleName.java`: enum ten role.
- `Blog.java`: entity bai viet.
- `Category.java`: entity danh muc.
- `Tag.java`: entity tag.
- `Comment.java`: entity comment.
- `BlogStatus.java`: enum trang thai blog.
- `CommentStatus.java`: enum trang thai comment.

> Day la tang mo ta cau truc bang du lieu va quan he trong DB.

### 2.5) `repository/` (truy cap du lieu)

- `UserRepository.java`
- `RoleRepository.java`
- `BlogRepository.java`
- `CategoryRepository.java`
- `TagRepository.java`
- `CommentRepository.java`

Vai tro:
- Chua interface truy van DB (`JpaRepository`...).
- Khong dat business logic vao day.

### 2.6) `service/` (business logic)

- `AuthService.java`
  - Dang ky, dang nhap, cap token, profile.

- `CurrentUserService.java`
  - Lay user hien tai tu security context.

- `BlogService.java`
  - Logic tao/sua/xoa/lay blog, trang thai, slug, lien ket category/tag.

- `CommentService.java`
  - Logic comment: tao, sua, xoa, duyet.

- `CategoryService.java`, `TagService.java`
  - CRUD category/tag va validation lien quan.

- `UserAdminService.java`
  - Nghiep vu admin quan ly user (role, trang thai...).

- `SlugService.java`
  - Sinh slug va dam bao khong trung.

> Tat ca xu ly nghiep vu nen dat o tang service.

### 2.7) `dto/` (request/response cho API)

- `dto/auth/`
  - `LoginRequest`, `RegisterRequest`, `AuthResponse`, `UserProfileResponse`.

- `dto/blog/`
  - `CreateBlogRequest`, `UpdateBlogRequest`, `BlogResponse`,
  - `CreateCommentRequest`, `CommentResponse`.

- `dto/catalog/`
  - `CategoryRequest`, `CategoryResponse`,
  - `TagRequest`, `TagResponse`.

- `dto/user/`
  - `UserSummaryResponse`, `ChangeUserRoleRequest`.

Vai tro:
- Dinh nghia hop dong API vao/ra.
- Khong expose truc tiep entity domain ra client.

### 2.8) `controller/` (API public)

- `AuthController.java`
  - Endpoint auth: login/register/me.

- `BlogController.java`
  - Endpoint public cho blog.

- `CommentController.java`
  - Endpoint comment cho user.

- `CategoryController.java`, `TagController.java`
  - Endpoint public cho category/tag.

Vai tro:
- Nhan request HTTP.
- Goi service va tra response.
- Controller nen mong, logic nam o service.

### 2.9) `controller/admin/` (API quan tri)

- `AdminBlogController.java`
- `AdminCategoryController.java`
- `AdminTagController.java`
- `AdminCommentController.java`
- `AdminUserController.java`

Vai tro:
- Endpoint danh cho admin.
- Thuc thi tac vu quan tri: duyet, cap nhat, quan ly user/noi dung.

### 2.10) `exception/` (xu ly loi toan cuc)

- `BadRequestException.java`
- `ForbiddenException.java`
- `ResourceNotFoundException.java`
- `ErrorResponse.java`
- `GlobalExceptionHandler.java`

Vai tro:
- Dinh nghia custom exception.
- Bat loi tap trung va tra ve HTTP status + body loi thong nhat.

---

## 3) `src/main/resources`

- `application.properties`
  - Cau hinh runtime: DB, JWT, port, logging...

---

## 4) `src/test`

- `src/test/java/com/example/simpleblog/SimpleBlogApiApplicationTests.java`
  - Test co ban cho app context, co the mo rong thanh integration/unit test.

- `src/test/resources/application.properties`
  - Cau hinh rieng cho moi truong test.

---

## 5) Mapping nhanh khi tai su dung cho du an moi

- API layer:
  - `controller`: API public
  - `controller/admin`: API admin

- Business layer:
  - `service`: nghiep vu chinh
  - service utility nho: `CurrentUserService`, `SlugService`...

- Data layer:
  - `domain`: model bang du lieu
  - `repository`: truy van DB

- API contract:
  - `dto/*`: request/response
  - `common/ApiResponse`: response format chung

- Cross-cutting:
  - `security`: xac thuc/phan quyen
  - `config`: bean/cau hinh chung
  - `exception`: xu ly loi
