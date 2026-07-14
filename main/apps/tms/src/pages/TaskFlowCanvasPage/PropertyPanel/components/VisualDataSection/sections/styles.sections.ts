import styled from "styled-components";
import { controlBase } from "../../../styles";
import { dashedBox } from "../../../../styles.shared";

export { Card as FieldCard } from "../../../../styles.shared";

export const FieldLabel = styled.div`
  font-size: 14px;
  font-weight: 800;
  color: #0f172a;
`;

export const FieldDesc = styled.div`
  margin-top: 2px;
  font-size: 12px;
  font-weight: 500;
  color: #64748b;
`;

export const FieldBody = styled.div`
  margin-top: 8px;
`;

export const InfoBox = styled.div`
  ${dashedBox}
  padding: 24px 16px; /* px-4 py-6 */
`;


export const TextInput = styled.input`
  ${controlBase}
`;

// 중첩 object 를 카드 안의 카드로 표현하기 위한 컨테이너/카드
export const NestedList = styled.div`
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

export const NestedCard = styled.div`
  border-radius: 10px;
  border: 1px solid #e2e8f0;
  background: #f8fafc;
  padding: 10px;
`;

export const NestedLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: #334155;
`;

export const InfoTabButton = styled.button<{ $active: boolean }>`
  height: 38px;
  border: none;
  border-radius: 999px;
  background: ${({ $active }) => ($active ? '#ffffff' : 'transparent')};
  color: ${({ $active }) => ($active ? '#111827' : '#4b5563')};
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: ${({ $active }) =>
        $active ? '0 1px 4px rgba(15, 23, 42, 0.08)' : 'none'};

  &:disabled {
    cursor: not-allowed;
    opacity: 0.55;
  }
`

export const InfoTabRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 4px;
  border-radius: 999px;
  background: #e5e7eb;
`

export const SectionDivider = styled.div`
  height: 1px;
  background: #e5e7eb;
  margin: 4px 0 2px;
`
