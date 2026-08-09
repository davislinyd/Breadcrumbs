import Foundation

public enum BreadcrumbsError: LocalizedError {
  case keychain(OSStatus)
  case randomFailed
  case keychainWriteFailed
  case sealFailed
  case invalidPayload
  case missingField(String)
  case unsupportedAction(String)

  public var errorDescription: String? {
    switch self {
    case .keychain(let status): return "Keychain error \(status)"
    case .randomFailed: return "Unable to generate vault key"
    case .keychainWriteFailed: return "Unable to store vault key"
    case .sealFailed: return "Unable to seal encrypted payload"
    case .invalidPayload: return "Invalid encrypted payload"
    case .missingField(let field): return "Missing field: \(field)"
    case .unsupportedAction(let action): return "Unsupported action: \(action)"
    }
  }

  public var code: String {
    switch self {
    case .keychain: return "keychain"
    case .randomFailed: return "random"
    case .keychainWriteFailed: return "keychain_write"
    case .sealFailed: return "seal"
    case .invalidPayload: return "invalid_payload"
    case .missingField: return "missing_field"
    case .unsupportedAction: return "unsupported"
    }
  }
}
