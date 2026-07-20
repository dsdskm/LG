import React, { useState } from 'react'
import { StyledPageContent, Section, Title, Button, Input } from '@repo/ui'
import { fileApis } from '@/apis'
import { toYmdHmKST } from '@/utils/dateUtils'

const Apitest = () => {
  const [query1_1, setQuery_1_1] = useState('')
  const [query1_2, setQuery_1_2] = useState('')
  const [query1_3, setQuery_1_3] = useState('')
  const [results_1, setResults_1] = useState([])
  const [query2_1, setQuery_2_1] = useState('')
  const [results_2, setResults_2] = useState('')

  const click_1 = async () => {
    try {
      let isoStart = ''
      let isoEnd = ''
      const deviceId = query1_3
      const query_1 = {}
      if (query1_1 != '') {
        const dateStart = query1_1 + ' 00:00:00'
        isoStart = new Date(dateStart).toISOString()
      }
      query_1.start = isoStart
      if (query1_2 != '') {
        const dateEnd = query1_2 + ' 23:59:59'
        isoEnd = new Date(dateEnd).toISOString()
      }
      query_1.end = isoEnd
      if (deviceId != '') query_1.deviceId = deviceId
      const response_1 = await fileApis.getFiles(query_1)

      setResults_1(response_1.content) // API 응답 데이터 저장
    } catch (error) {
      console.error('API 호출 에러:', error)
    }
  }

  const click_2 = async () => {
    try {
      const response_2 = await fileApis.getFilesDownloardurl(query2_1)

      setResults_2(response_2.presignedUrl) // API 응답 데이터 저장
    } catch (error) {
      console.error('API 호출 에러:', error)
    }
  }

  return (
    <>
      <StyledPageContent>
        <Section>
          <Title>Apitest</Title>
          <br></br>
          <div>
            <p>파일 목록 조회</p>
            <br></br>
            start (ex.2026-01-01)
            <input type="text" value={query1_1} onChange={(e) => setQuery_1_1(e.target.value)} />
            <br></br>
            end (ex.2026-01-30)
            <input type="text" value={query1_2} onChange={(e) => setQuery_1_2(e.target.value)} />
            <br></br>
            deviceId
            <input type="text" value={query1_3} onChange={(e) => setQuery_1_3(e.target.value)} />
            <Button onClick={click_1}>getFiles</Button>
            <ul>
              {results_1.map((item, index) => (
                <li>
                  {item.fileId} {' | '} {item.originalName} {' | '} {item.fileSize} {' | '} {item.deviceId} {' | '}{' '}
                  {toYmdHmKST(item.createdAt)}
                </li>
              ))}
            </ul>
          </div>

          <br></br>

          <div>
            <p>다운로드 URL 조회</p>
            <br></br>
            <input type="text" value={query2_1} onChange={(e) => setQuery_2_1(e.target.value)} />
            <Button onClick={click_2}>getFilesDownloardurl</Button>
            <ul>{results_2}</ul>
          </div>
        </Section>
      </StyledPageContent>
    </>
  )
}

export default Apitest
