export const PIN_MIN_LENGTH = 6
export const PIN_MAX_LENGTH = 8

export function getPinPolicyLabel() {
  return `${PIN_MIN_LENGTH}-${PIN_MAX_LENGTH} digitos numericos`
}
