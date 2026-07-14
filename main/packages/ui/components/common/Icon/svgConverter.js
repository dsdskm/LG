/**
 * svg 태그의 path 태그에서 d 속성 값만 뽑는 모듈
 * 해당 모듈로 outlinedPaths.json, filledPaths.json 파일을 생성하였음
 *
 * 사용법
 * 1. 아래 코드의 Steps 따라 진행
 * 2. 해당 파일만 node 환경에서 실행
 *
 * 데이터 형식
 * 1. path 태그가 1개일 경우
 * - d 속성 값(String)
 * 2. path 태그가 2개 이상일 경우
 * - [{ id: 고유 키(Number), d: d 속성 값(String) }]
 */

const fs = require('fs')

function parseSvgString(name, svgString) {
  const pathRegex = /<path\s[^>]*d="([^"]+)"[^>]*>/g
  const paths = []
  let match = pathRegex.exec(svgString)

  while (match !== null) {
    const d = match[1]
    const id = paths.length + 1

    paths.push({ id, d })
    match = pathRegex.exec(svgString)
  }

  return {
    key: name.trim(),
    value: paths.length === 1 ? paths[0].d : paths
  }
}
const pathsData = (data) =>
  data.reduce((acc, current) => {
    const d = parseSvgString(...current)
    return { ...acc, [d.key]: d.value }
  }, {})

// Steps

// 1. svgMap에 ['아이콘 이름', `아이콘 svg 태그`]를 배열로 담는다
const svgMap = [
  [
    'arrow_table',
    `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M13.0701 3.43994L17.29 7.65991C18.23 8.6001 17.5601 10.22 16.23 10.22L7.77002 10.24C6.44006 10.24 5.76001 8.62988 6.70996 7.67993L10.9501 3.43994C11.53 2.8501 12.48 2.8501 13.0701 3.43994ZM10.9301 20.5601L6.70996 16.3401C5.77002 15.3999 6.44006 13.78 7.77002 13.78L16.23 13.76C17.5601 13.76 18.24 15.3701 17.29 16.3201L13.05 20.5601C12.47 21.1499 11.52 21.1499 10.9301 20.5601Z" fill="black"/>
</svg>
`
  ],
  [
    'publish',
    `
<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M5.63496 13.2252L10.9383 7.92193C11.5241 7.33615 12.4738 7.33615 13.0596 7.92193L18.3629 13.2252L16.9518 14.6363L11.9983 9.68281L7.04544 14.6357L5.63496 13.2252Z" fill="black"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M12.9997 21.004L13 8.49126L11 8.49122L10.9997 21.0039L12.9997 21.004Z" fill="black"/>
<path fill-rule="evenodd" clip-rule="evenodd" d="M20 2.75171H4V4.75171H20V2.75171Z" fill="black"/>
</svg>
`
  ]
]

// 2. fileName에 저장될 파일명을 세팅한다
const fileName = 'paths.json'

// 3-1. 콘솔로 데이터 확인
console.log(pathsData(svgMap))

// 3-2. 파일로 데이터 저장
fs.writeFile(fileName, JSON.stringify(pathsData(svgMap)), (err) => {
  if (err) console.log('Error: ', err)
  else console.log('File created')
})
