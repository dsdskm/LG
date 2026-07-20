import Dropdown from '../../common/Dropdown'
import IconButton from '../../common/IconButton'
import { StyledPageButton, StyledPagination } from './styles'
import { StyledDivider } from '@repo/ui/styles'
import { useResponsiveStore } from '@repo/stores/useResponsiveStore'
import { useTranslation } from 'react-i18next'

const Pagination = ({
  currentPage,
  rowCount,
  onChangePage,
  paginationRowsPerPageOptions,
  rowsPerPage,
  onChangeRowsPerPage
}) => {
  const { t } = useTranslation('common')
  const { windowWidth } = useResponsiveStore()
  const pageCount = Math.ceil(rowCount / rowsPerPage)
  const calculatePageRange = () => {
    const maxPageButtonLength = windowWidth > 1024 ? 10 : 5
    const showPage = Math.floor(currentPage / maxPageButtonLength)
    const startIndex =
      currentPage % maxPageButtonLength === 0 ? maxPageButtonLength * (showPage - 1) : maxPageButtonLength * showPage
    const endIndex = Math.min(startIndex + maxPageButtonLength, pageCount)

    return Array.from({ length: endIndex - startIndex }, (_, i) => startIndex + i + 1)
  }

  const handleClickButton = {
    first: () => onChangePage(1, rowCount),
    prev: () => onChangePage(currentPage - 1, rowCount),
    page: ({ target }) => onChangePage(Number(target.value), rowCount),
    next: () => onChangePage(currentPage + 1, rowCount),
    last: () => onChangePage(pageCount, rowCount)
  }

  const handleChangePerPage = (value) => onChangeRowsPerPage(Number(value), currentPage)

  return (
    <>
      <StyledDivider $gap={2.4} $full />
      <StyledPagination className="pagination">
        {paginationRowsPerPageOptions.length > 0 && (
          <div className="perPageSelect">
            <Dropdown
              size="sm"
              options={paginationRowsPerPageOptions}
              onChange={handleChangePerPage}
              defaultValue={paginationRowsPerPageOptions[0]}
            />
            <span className="typographyBody5">{t('itemsPerPage')}</span>
          </div>
        )}
        <div className="paginationNav">
          <IconButton
            size="sm"
            shape="square"
            name="arrow_double_left"
            onClick={handleClickButton.first}
            disabled={currentPage === 1}
          />
          <IconButton
            size="sm"
            shape="square"
            name="arrow_left"
            onClick={handleClickButton.prev}
            disabled={currentPage === 1}
          />
          {calculatePageRange().length > 0 && (
            <div className="pageButtons">
              {calculatePageRange().map((pageNumber) => (
                <StyledPageButton
                  key={pageNumber}
                  type="button"
                  value={pageNumber}
                  className={`typographyBody5 ${currentPage === pageNumber ? 'selected' : ''}`}
                  onClick={handleClickButton.page}
                >
                  {pageNumber}
                </StyledPageButton>
              ))}
            </div>
          )}
          <IconButton
            size="sm"
            shape="square"
            name="arrow_right"
            onClick={handleClickButton.next}
            disabled={currentPage === pageCount}
          />
          <IconButton
            size="sm"
            shape="square"
            name="arrow_double_right"
            onClick={handleClickButton.last}
            disabled={currentPage === pageCount}
          />
        </div>
      </StyledPagination>
    </>
  )
}

export default Pagination
