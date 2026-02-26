package br.com.vounovolei.api.controller.admin;

import br.com.vounovolei.api.controller.admin.dto.AdminChangePasswordRequest;
import br.com.vounovolei.api.controller.admin.dto.AdminEventResponse;
import br.com.vounovolei.api.controller.admin.dto.AdminUpdateEventRequest;
import br.com.vounovolei.api.controller.admin.dto.AdminUpdateUserRequest;
import br.com.vounovolei.api.controller.admin.dto.AdminUserResponse;
import br.com.vounovolei.api.service.AdminService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminController {

    private final AdminService adminService;

    @GetMapping("/users")
    public ResponseEntity<List<AdminUserResponse>> listUsers(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(adminService.listUsers(q));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<AdminUserResponse> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getUser(id));
    }

    @PutMapping("/users/{id}")
    public ResponseEntity<AdminUserResponse> updateUser(@PathVariable Long id, @RequestBody AdminUpdateUserRequest req) {
        return ResponseEntity.ok(adminService.updateUser(id, req));
    }

    @PatchMapping("/users/{id}/password")
    public ResponseEntity<Void> changeUserPassword(
            @PathVariable Long id,
            @RequestBody @Valid AdminChangePasswordRequest req
    ) {
        adminService.changeUserPassword(id, req.newPassword());
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        adminService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/events")
    public ResponseEntity<List<AdminEventResponse>> listEvents(@RequestParam(required = false) String q) {
        return ResponseEntity.ok(adminService.listEvents(q));
    }

    @GetMapping("/events/{id}")
    public ResponseEntity<AdminEventResponse> getEvent(@PathVariable Long id) {
        return ResponseEntity.ok(adminService.getEvent(id));
    }

    @PutMapping("/events/{id}")
    public ResponseEntity<AdminEventResponse> updateEvent(
            @PathVariable Long id,
            @RequestBody @Valid AdminUpdateEventRequest req
    ) {
        return ResponseEntity.ok(adminService.updateEvent(id, req));
    }

    @DeleteMapping("/events/{id}")
    public ResponseEntity<Void> deleteEvent(@PathVariable Long id) {
        adminService.deleteEvent(id);
        return ResponseEntity.noContent().build();
    }
}
