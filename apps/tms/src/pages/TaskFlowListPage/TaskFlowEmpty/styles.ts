// TaskFlowEmpty.styles.ts
import styled from "styled-components";

export const Card = styled.div`
  border-radius: 16px; /* rounded-2xl */
  border: 1px solid #e4e4e7; /* zinc-200 */
  background: #ffffff;
  padding: 24px; /* p-6 */
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08); /* shadow-sm */
`;

export const EmptyBox = styled.div`
  border-radius: 12px; /* rounded-xl */
  border: 1px dashed #d4d4d8; /* zinc-300 */
  background: #fafafa; /* zinc-50 */
  padding: 40px 24px; /* px-6 py-10 */
  text-align: center;
`;

export const IconWrap = styled.div`
  margin: 0 auto;

  display: flex;
  align-items: center;
  justify-content: center;

  height: 48px; /* h-12 */
  width: 48px; /* w-12 */

  border-radius: 12px; /* rounded-xl */
  background: #ffffff;
  color: #71717a; /* zinc-500 */
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.08);
`;

export const Icon = styled.span`
  font-size: 20px; /* text-xl */
  line-height: 1;
`;

export const Title = styled.h2`
  margin-top: 16px; /* mt-4 */
  font-size: 16px; /* text-base */
  font-weight: 700; /* font-bold */
  color: #18181b; /* zinc-900 */
`;

export const Description = styled.p`
  margin-top: 8px; /* mt-2 */
  font-size: 14px; /* text-sm */
  color: #71717a; /* zinc-500 */
`;

export const Strong = styled.span`
  font-weight: 600; /* font-semibold */
`;

export const Actions = styled.div`
  margin-top: 20px; /* mt-5 */
  display: flex;
  justify-content: center;
`;

export const Plus = styled.span`
  font-size: 16px; /* text-base */
  line-height: 1; /* leading-none */
`;
``