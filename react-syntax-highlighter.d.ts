declare module "react-syntax-highlighter" {
  import { type ComponentType } from "react"

  export const PrismLight: ComponentType<any> & {
    registerLanguage: (name: string, syntax: unknown) => void
  }
}

declare module "react-syntax-highlighter/dist/esm/languages/prism/python" {
  const python: unknown

  export default python
}
