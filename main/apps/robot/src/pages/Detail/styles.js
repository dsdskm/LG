import styled from 'styled-components'

export const DetailWrapper = styled.div`
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  height: 100%;
  display: flex;
`

export const DivErrorList = styled.div`
  border-color: #f0f0f0;
  --tw-divide-y-reverse: 0;
  border-bottom-style: solid;
  border-top-style: solid;
  border-top-width: 0;
  border-bottom-width: calc(1px);

  &:last-child {
    border-bottom-width: 0;
  }
`

export const SectionList = styled.div`
  display: flex;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1.6rem;
`

export const ControlDiv = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr)); /* grid-cols-2 */
  gap: 8px; /* gap-2 */
  margin-bottom: 16px; /* mb-4 */

  @media (min-width: 640px) {
    grid-template-columns: repeat(4, minmax(0, 1fr)); /* sm:grid-cols-4 */
    margin-bottom: 20px; /* sm:mb-5 */
  }
`

export const ControlBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  background-color: ${({ $danger, $info }) => ($danger ? '#fee2e2' : $info ? '#dbeafe' : '#e5e7eb')};
  border: 1px solid #ffffff;
  color: #555;
  border-radius: 6px;
  font-size: 14px;
  transition: background-color 0.2s ease;
  &:hover {
    background-color: ${({ $danger, $info }) => ($danger ? '#fecaca' : $info ? '#bfdbfe' : '#f8fafc')};
  }
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    background-color: ${({ $danger, $info }) => ($danger ? '#fee2e2' : $info ? '#dbeafe' : '#e5e7eb')};
  }
  &:disabled:hover {
    background-color: ${({ $danger, $info }) => ($danger ? '#fee2e2' : $info ? '#dbeafe' : '#e5e7eb')};
  }
`
