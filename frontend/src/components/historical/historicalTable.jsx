import React, { useMemo, useEffect, useState } from 'react'
import { getCalvesByRanch } from '../../api/calves'
import { useToken } from '../../api/useToken'
import FullTable from '../tables/FullTable'
import dayjs from 'dayjs'
import isBetween from 'dayjs/plugin/isBetween'

// 🔹 Extender dayjs con plugins
dayjs.extend(isBetween)

const HistoricalTable = ({ ranchId }) => {

  // 🔹 Estados
  const [calves, setCalves] = useState([])
  const token = useToken()

  // 🔹 Cargar datos de becerros por rancho
  useEffect(() => {
    if (!token) return

    const fetchCalves = async () => {
      try {
        const data = await getCalvesByRanch(ranchId, token)

        // Ordenar por primaryID de forma numérica
        const sortedData = [...data].sort((a, b) =>
          a.primaryID.localeCompare(b.primaryID, undefined, { numeric: true })
        )

        setCalves(sortedData)
      } catch (error) {
        console.error('Error fetching calves:', error)
      }
    }

    fetchCalves()
  }, [token, ranchId])

  // 🔹 Definición de columnas de la tabla
  const columns = useMemo(() => [
    { accessorKey: 'primaryID', header: 'Tag', align: 'left' },
    { accessorKey: 'originalID', header: 'Org. ID', align: 'left' },
    { accessorKey: 'EID', header: 'EID', align: 'left' },

    {
      accessorKey: 'placedDate',
      header: 'Date',
      align: 'center',
      cell: (cell) => dayjs(cell.getValue()).format('MM/DD/YYYY'),

      // Filtro personalizado por rango o fecha específica
      filterFn: (row, columnId, filterValue) => {
        if (!filterValue) return true
        const rowDate = dayjs(row.getValue(columnId))

        // Rango de fechas
        if (filterValue.dateFrom || filterValue.dateTo) {
          const from = filterValue.dateFrom ? dayjs(filterValue.dateFrom).startOf('day') : null
          const to = filterValue.dateTo ? dayjs(filterValue.dateTo).endOf('day') : null

          if (from && to) return rowDate.isBetween(from, to, null, '[]')
          if (from) return rowDate.isSame(from, 'day') || rowDate.isAfter(from)
          if (to) return rowDate.isSame(to, 'day') || rowDate.isBefore(to)
        }

        // Fecha puntual
        if (filterValue.date) {
          const filterDate = dayjs(filterValue.date).startOf('day')
          return rowDate.isSame(filterDate, 'day')
        }

        return true
      }
    },

    {
      accessorKey: 'breed',
      header: 'Breed',
      align: 'left',
      filterFn: 'equalsString',
      cell: (info) => {
        const value = info.getValue()
        return value
          ? value.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
          : ''
      }
    },

    {
      accessorKey: 'sex',
      header: 'Sex',
      align: 'center',
        cell: (info) => {
          let value = info.getValue()
          if (value) {
            value = value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
            if (value === "Freemartin" || value === "FreeMartin") {
              value = "Free Martin"
            }
            return value
          }
          return ""
        }
    },

    {
      accessorKey: 'price',
      header: 'Price',
      align: 'center',
      cell: (info) => {
        const value = info.getValue()
        return `$${Number(value).toLocaleString('en-US', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        })}`
      }
    },

    {
      accessorKey: 'seller',
      header: 'Seller',
      align: 'center',
      cell: (info) => {
        const value = info.getValue()
        return value
          ? value.toLowerCase().replace(/\b\w/g, char => char.toUpperCase())
          : ''
      }
    },

    {
      accessorKey: 'status',
      header: 'Status',
      align: 'center',
      cell: (info) => {
        const value = info.getValue()
        return value
          ? value.charAt(0).toUpperCase() + value.slice(1).toLowerCase()
          : ''
      }
    }
  ], [])

  // 🔹 Render principal
  return (
    <>
      <FullTable data={calves} columns={columns} sortingPriority="primaryID" />
    </>
  )
}

export default HistoricalTable
