// SVG 아이콘 배럴
//
// 이 프로젝트의 vite 설정은 svgr({ include: '**/*.svg' }) 이므로,
// '?react' 쿼리 없이 plain 으로 import 한 .svg 가 React 컴포넌트로 변환됩니다.
// (반대로 '?react' 를 붙이면 include 패턴에 안 걸려 변환되지 않고 URL 문자열이 됩니다.)
//
// 다만 타입(vite/client)은 '*.svg' 를 string 으로 선언하므로,
// 런타임 실제 타입(React 컴포넌트)에 맞게 캐스팅해서 내보냅니다.
import type { FC, SVGProps } from 'react'
import DivIcon from './svg/div.svg'
import RedoIcon from './svg/redo.svg'
import UndoIcon from './svg/undo.svg'

type SvgComponent = FC<SVGProps<SVGSVGElement>>

export const Div = DivIcon as unknown as SvgComponent
export const Redo = RedoIcon as unknown as SvgComponent
export const Undo = UndoIcon as unknown as SvgComponent
