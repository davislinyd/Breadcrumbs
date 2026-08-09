import Foundation
import BreadcrumbsCore

enum HostHandlers {
  static func handle(_ request: [String: Any]) -> [String: Any] {
    let actionName = request["action"] as? String ?? ""
    guard let action = NativeAction(rawValue: actionName) else {
      return NativeResponse.fail(BreadcrumbsError.unsupportedAction(actionName))
    }

    do {
      switch action {
      case .status:
        return NativeResponse.ok([
          "available": true,
          "updatedAt": BreadcrumbsCore.state()["updatedAt"] ?? NSNull(),
        ])
      case .snapshot:
        try BreadcrumbsCore.saveSnapshot(request["payload"] ?? [:])
        return NativeResponse.ok(["stored": true])
      case .vaultPut:
        guard let id = request["id"] as? String else { throw BreadcrumbsError.missingField("id") }
        guard let payload = request["payload"] else { throw BreadcrumbsError.missingField("payload") }
        var vault = try BreadcrumbsCore.readVault()
        vault[id] = payload
        try BreadcrumbsCore.saveVault(vault)
        return NativeResponse.ok(["stored": true])
      case .vaultGet:
        let vault = try BreadcrumbsCore.readVault()
        let id = request["id"] as? String ?? ""
        return NativeResponse.ok(["entry": vault[id] ?? NSNull()])
      case .vaultList:
        return NativeResponse.ok(["entries": Array(try BreadcrumbsCore.readVault().values)])
      case .vaultDelete:
        var vault = try BreadcrumbsCore.readVault()
        vault.removeValue(forKey: request["id"] as? String ?? "")
        try BreadcrumbsCore.saveVault(vault)
        return NativeResponse.ok(["deleted": true])
      }
    } catch {
      return NativeResponse.fail(error)
    }
  }
}
