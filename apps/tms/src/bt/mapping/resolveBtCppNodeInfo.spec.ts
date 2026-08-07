import { resolveBtCppNodeInfo } from './resolveBtCppNodeInfo'

// content 가 붙은 ACTION 노드(PlaySound + BGM)
function makePlaySoundNode(properties: Record<string, unknown>) {
  return {
    id: '7',
    position: { x: 0, y: 0 },
    data: {
      label: '이동',
      taskId: 31,
      taskName: 'PlaySound',
      taskType: 'ACTION',
      contentId: 11425,
      contentName: '이동',
      contentTypeName: 'BGM',
      contentValue:
        '{"id":"3_300_null_null","fileContents":[{"id":34,"fileName":"bgm-01.wav","fileType":"AUDIO"}],"textContents":[]}',
      propertySchema: {
        properties: {
          sound_id: { type: 'content_reference', required: true, content_type: 'BGM' },
          // repeat_count: { type: 'number', default: 1, required: false }
        }
      },
      properties
    }
  } as any
}

describe('resolveBtCppNodeInfo', () => {
  it('content 로 정해지는 속성은 content value 에서, 그 외 속성은 노드 properties 에서 가져온다', () => {
    const { tag, attrs } = resolveBtCppNodeInfo(makePlaySoundNode({ sound_id: 11425, repeat_count: 1 }))

    expect(tag).toBe('PlaySound')
    expect(attrs.sound_id).toBe('3_300_null_null')
    expect(attrs.repeat_count).toBe('1')
  })

  it('패널에서 수정한 properties 값이 BT attribute 에 반영된다', () => {
    const { attrs } = resolveBtCppNodeInfo(makePlaySoundNode({ sound_id: 11425, repeat_count: -1 }))

    expect(attrs.repeat_count).toBe('-1')
  })
})
