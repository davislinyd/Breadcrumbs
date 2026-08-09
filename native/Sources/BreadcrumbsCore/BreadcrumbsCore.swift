import CryptoKit
import Foundation
import LocalAuthentication
import Security

public enum BreadcrumbsCore {
  private final class AuthenticationResult: @unchecked Sendable { var success = false }
  private static let service = "dev.breadcrumbs.host"
  private static let account = "vault-key-v1"

  public static var directory: URL {
    FileManager.default.homeDirectoryForCurrentUser.appending(path: "Library/Application Support/Breadcrumbs", directoryHint: .isDirectory)
  }
  public static var snapshotURL: URL { directory.appending(path: "snapshot.bin") }
  public static var vaultURL: URL { directory.appending(path: "vault.bin") }
  public static var stateURL: URL { directory.appending(path: "state.json") }

  public static func prepareDirectory() throws {
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true, attributes: [.posixPermissions: 0o700])
  }

  private static func vaultKey() throws -> SymmetricKey {
    let lookup: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecReturnData as String: true,
    ]
    var item: CFTypeRef?
    let status = SecItemCopyMatching(lookup as CFDictionary, &item)
    if status == errSecSuccess, let data = item as? Data { return SymmetricKey(data: data) }
    guard status == errSecItemNotFound else { throw BreadcrumbsError.keychain(status) }
    var bytes = [UInt8](repeating: 0, count: 32)
    guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
      throw BreadcrumbsError.randomFailed
    }
    let data = Data(bytes)
    let add: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: service,
      kSecAttrAccount as String: account,
      kSecValueData as String: data,
      kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
    ]
    guard SecItemAdd(add as CFDictionary, nil) == errSecSuccess else { throw BreadcrumbsError.keychainWriteFailed }
    return SymmetricKey(data: data)
  }

  private static func saveEncrypted(_ object: Any, to url: URL) throws {
    try prepareDirectory()
    let plain = try JSONSerialization.data(withJSONObject: object, options: [])
    let sealed = try AES.GCM.seal(plain, using: vaultKey())
    guard let combined = sealed.combined else { throw BreadcrumbsError.sealFailed }
    try combined.write(to: url, options: [.atomic])
    try FileManager.default.setAttributes([.posixPermissions: 0o600], ofItemAtPath: url.path())
  }

  private static func readEncrypted(_ url: URL) throws -> [String: Any] {
    let encrypted = try Data(contentsOf: url)
    let box = try AES.GCM.SealedBox(combined: encrypted)
    let plain = try AES.GCM.open(box, using: vaultKey())
    guard let object = try JSONSerialization.jsonObject(with: plain) as? [String: Any] else {
      throw BreadcrumbsError.invalidPayload
    }
    return object
  }

  public static func saveSnapshot(_ object: Any) throws {
    try saveEncrypted(object, to: snapshotURL)
    try JSONSerialization.data(withJSONObject: ["updatedAt": Date().timeIntervalSince1970]).write(to: stateURL, options: [.atomic])
  }

  public static func readSnapshot() throws -> [String: Any] {
    try readEncrypted(snapshotURL)
  }

  public static func readVault() throws -> [String: Any] {
    guard FileManager.default.fileExists(atPath: vaultURL.path()) else { return [:] }
    return try readEncrypted(vaultURL)
  }

  public static func saveVault(_ value: [String: Any]) throws { try saveEncrypted(value, to: vaultURL) }

  public static func state() -> [String: Any] {
    (try? JSONSerialization.jsonObject(with: Data(contentsOf: stateURL)) as? [String: Any]) ?? [:]
  }

  public static func authenticate() -> Bool {
    let context = LAContext()
    var error: NSError?
    guard context.canEvaluatePolicy(.deviceOwnerAuthentication, error: &error) else { return false }
    let semaphore = DispatchSemaphore(value: 0)
    let result = AuthenticationResult()
    context.evaluatePolicy(.deviceOwnerAuthentication, localizedReason: "Unlock Breadcrumbs cookie values") { success, _ in
      result.success = success
      semaphore.signal()
    }
    _ = semaphore.wait(timeout: .now() + 60)
    return result.success
  }

  public static func redact(_ value: Any) -> Any {
    guard var item = value as? [String: Any] else { return value }
    if let text = item["value"] as? String {
      item["value"] = String(repeating: "•", count: min(max(text.count, 12), 24))
    }
    return item
  }
}
