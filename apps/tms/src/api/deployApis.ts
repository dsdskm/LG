import { client } from '@repo/apis'
import { ENDPOINTS } from './apiConstants'
import { useMutation } from '@tanstack/react-query'

const axiosClient = client(import.meta.env.VITE_API_BASE_URL)
const path = ENDPOINTS.TMS.DEPLOY

async function deployTaskFlow(params: DeployRequest) {
  console.log('deployTaskFlow parms', params)
  const response = await axiosClient.post(path, params)
  return response
}

export function useDeployTaskFlow() {
  return useMutation({
    mutationFn: (params: DeployRequest) => deployTaskFlow(params)
  })
}

// useMutaion 사용법

// const {
//   mutate,         // 실행 함수
//   isPending,      // 로딩 상태 플래그
//   isSuccess,      // 성공 여부 플래그
//   error           // 에러 객체
// } = useMutation({
//   mutationFn: (id) => axios.delete(`api/delete/${id}`)
// });

// // JSX에서 활용 예시
// return (
//   <button onClick={() => mutate(42)} disabled={isPending}>
//     {isPending ? '삭제 중...' : '삭제하기'}
//   </button>
// );

