// Javascript 모듈 import를 위한 type선언

declare module '@repo/stores' {
  // zustand 스토어 훅: 인자 없이 호출하면 상태 전체, selector 를 넘기면 선택한 값만 반환한다.
  type StoreHook = (selector?: (state: any) => any) => any

  export const useOrganizationStore: StoreHook
  export const useUserStore: StoreHook
  export const useResponsiveStore: StoreHook
  export const useRouteStore: StoreHook
  export const useThemeStore: StoreHook
}

declare module '@repo/apis'

declare module '@repo/ui/components/layout/Header/styles' {
  export const StyledHeader: any
  export const StyledHeaderButton: any
}

declare module '@repo/ui/styles' {
  export const GlobalStyle: React.ComponentType<any>
}

declare module '@repo/ui' {
  export const MainLayout: React.ComponentType<any>
  export const AiAssistantPanel: React.ComponentType<any>
  export const Toast: React.ComponentType<any>
  export const Title: any
  export const StyledPageContent: any
  export const Tab: any
  export const Tabs: any
  export const Icon: any
  export const OrganizationSelector: any
  export const Dropdown: any
  export const SearchContainer: any
  export const Search: any
  export const SectionRobot: any
  export const Button: any
  export const HeaderTitleGroup: any
  export const NoData: any
  export const Section: any
  export const Modal: any
  export const ModalButton: any
  export const IconButton: any
  export const Checkbox: any
  export const Input: any
  export const Textarea: any
  export const Loading: any
  export const Tag: any
  export const ToggleSwitch: any
}

declare module '@repo/hooks' {
  export function useWindowDimensions(): void
}

declare module '@repo/utils' {
  export function convertDateToString(value: string): any
}
