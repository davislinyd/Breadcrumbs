import Foundation

public enum NativeAction: String {
  case status
  case snapshot
  case vaultPut
  case vaultGet
  case vaultList
  case vaultDelete
}

public enum NativeResponse {
  public static func ok(_ fields: [String: Any] = [:]) -> [String: Any] {
    var payload = fields
    payload["ok"] = true
    return payload
  }

  public static func fail(_ error: Error, code: String? = nil) -> [String: Any] {
    let breadcrumbs = error as? BreadcrumbsError
    return [
      "ok": false,
      "error": error.localizedDescription,
      "code": code ?? breadcrumbs?.code ?? "error",
    ]
  }
}
