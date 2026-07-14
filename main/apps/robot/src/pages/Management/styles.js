import styled from 'styled-components'

export const ButtonWrap = styled.div`
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;

  &.alignLeft {
    justify-content: flex-start;
  }

  &.alignRight {
    justify-content: flex-end;
  }

  &.alignCenter {
    justify-content: center;
  }
`

export const SearchContainer = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 12px;
  width: 100%;

  .dropdown {
    width: 250px;
  }

  .search {
    width: 100%;
  }

  input {
    flex: 1;
    padding: 10px 16px 10px 0;
    font-size: 14px;
    transition: border-color 0.15s ease;
    box-sizing: border-box;

    &:focus {
      outline: none;
      border-color: #495057;
    }

    &::placeholder {
      color: #adb5bd;
    }
  }
`

export const P = styled.p``
