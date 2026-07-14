import React from 'react'
import { ClipLoader } from 'react-spinners'
import { LoadingWrapper, SpinnerContainer, PulseRing, LoadingText } from './styles'

const TableLoading = ({ message }) => {
  return (
    <LoadingWrapper>
      <SpinnerContainer>
        <PulseRing />
        <ClipLoader color={'#36d7b7'} loading={true} size={45} />
      </SpinnerContainer>
      {message && <LoadingText>{message}</LoadingText>}
    </LoadingWrapper>
  )
}

export default TableLoading
