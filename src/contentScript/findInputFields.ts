import { FindInputFieldsResponse } from '../App/TabMaven/types'

export const findInputFields = async (): Promise<FindInputFieldsResponse> => {
  // Look for all <article aria-labelledby=".."/> strings
  const inputs = document.querySelectorAll('input, textarea')

  return { inputs: Array.from(inputs) as HTMLElement[] }
}
