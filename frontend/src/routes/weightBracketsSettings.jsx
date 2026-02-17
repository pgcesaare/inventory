import { useCallback, useEffect, useMemo, useState } from "react"
import { useToken } from "../api/useToken"
import { getRanchById, getRanches, updateRanch } from "../api/ranches"
import { getBreeds } from "../api/breeds"
import { useAppContext } from "../context"
import { DEFAULT_WEIGHT_BRACKETS, createWeightBracket, normalizeWeightBrackets } from "../utils/weightBrackets"
import { Check, ChevronDown, ChevronsUpDown, GripVertical } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@components/ui/command"

const normalizeStateValue = (value) => String(value || "").trim().toLowerCase()
const normalizeBreedValue = (value) => String(value || "").trim()
const getBracketKey = (bracket, index) => String(bracket?.key || `bracket_${index + 1}`)
const DEFAULT_CATEGORY_LABEL = "General"
const CATEGORY_KEY_PREFIX = "cat:"
const CATEGORY_KEY_SEPARATOR = "::"

const normalizeCategoryLabel = (value) => {
  const normalized = String(value || "").trim()
  return normalized || DEFAULT_CATEGORY_LABEL
}

const parseBracketCategoryKey = (value, index = 0) => {
  const fallbackBracketKey = `bracket_${index + 1}`
  const raw = String(value || fallbackBracketKey).trim() || fallbackBracketKey

  if (!raw.startsWith(CATEGORY_KEY_PREFIX)) {
    return {
      categoryLabel: DEFAULT_CATEGORY_LABEL,
      bracketKey: raw,
    }
  }

  const separatorIndex = raw.indexOf(CATEGORY_KEY_SEPARATOR)
  if (separatorIndex <= CATEGORY_KEY_PREFIX.length) {
    return {
      categoryLabel: DEFAULT_CATEGORY_LABEL,
      bracketKey: raw,
    }
  }

  const encodedCategory = raw.slice(CATEGORY_KEY_PREFIX.length, separatorIndex)
  const bracketKey = raw.slice(separatorIndex + CATEGORY_KEY_SEPARATOR.length) || fallbackBracketKey

  let categoryLabel = DEFAULT_CATEGORY_LABEL
  try {
    categoryLabel = decodeURIComponent(encodedCategory)
  } catch {
    categoryLabel = DEFAULT_CATEGORY_LABEL
  }

  return {
    categoryLabel: normalizeCategoryLabel(categoryLabel),
    bracketKey,
  }
}

const buildBracketCategoryKey = (categoryLabel, bracketKey, index = 0) => {
  const safeCategory = normalizeCategoryLabel(categoryLabel)
  const safeBracketKey = String(bracketKey || `bracket_${index + 1}`).trim() || `bracket_${index + 1}`
  return `${CATEGORY_KEY_PREFIX}${encodeURIComponent(safeCategory)}${CATEGORY_KEY_SEPARATOR}${safeBracketKey}`
}

const getBracketCategoryLabel = (bracket, index) => {
  const sourceKey = getBracketKey(bracket, index)
  return parseBracketCategoryKey(sourceKey, index).categoryLabel
}

const getBracketBaseKey = (bracket, index) => {
  const sourceKey = getBracketKey(bracket, index)
  return parseBracketCategoryKey(sourceKey, index).bracketKey
}

const groupBracketsByCategory = (brackets) => {
  const source = Array.isArray(brackets) ? brackets : []
  const byCategory = new Map()
  const groups = []

  source.forEach((bracket, index) => {
    const categoryLabel = getBracketCategoryLabel(bracket, index)
    if (!byCategory.has(categoryLabel)) {
      const group = { categoryLabel, items: [] }
      byCategory.set(categoryLabel, group)
      groups.push(group)
    }
    byCategory.get(categoryLabel).items.push({ bracket, index })
  })

  return groups
}

const createDefaultStateConfig = () => ({
  loaded: false,
  loading: false,
  saving: false,
  hasMixed: false,
  baselineBrackets: DEFAULT_WEIGHT_BRACKETS,
  brackets: DEFAULT_WEIGHT_BRACKETS,
})

const isEmptyBracketDraft = (bracket) => {
  const label = String(bracket?.label || "").trim()
  const hasMin = bracket?.min !== null && bracket?.min !== undefined && String(bracket.min) !== ""
  const hasMax = bracket?.max !== null && bracket?.max !== undefined && String(bracket.max) !== ""
  const hasBreeds = Array.isArray(bracket?.breeds) && bracket.breeds.some((item) => normalizeBreedValue(item))

  return !label && !hasMin && !hasMax && !hasBreeds
}

const pruneEmptyBracketDrafts = (brackets) => (
  Array.isArray(brackets) ? brackets.filter((item) => !isEmptyBracketDraft(item)) : []
)

const removeBracketDescriptions = (brackets) => (
  normalizeWeightBrackets(brackets).map((item) => ({ ...item, description: "" }))
)

const getBreedsLegend = (breeds) => {
  const safeBreeds = Array.isArray(breeds) ? breeds.map((item) => normalizeBreedValue(item)).filter(Boolean) : []
  if (safeBreeds.length === 0) return "All breeds"
  if (safeBreeds.length <= 2) return safeBreeds.join(", ")
  return `${safeBreeds[0]}, ${safeBreeds[1]} +${safeBreeds.length - 2} more`
}

const WeightBracketsSettings = () => {
  const token = useToken()
  const { ranch, setRanch, showSuccess, showError } = useAppContext()
  const [loadingBreeds, setLoadingBreeds] = useState(true)
  const [breedOptions, setBreedOptions] = useState([])
  const [loadingRanches, setLoadingRanches] = useState(true)
  const [availableRanches, setAvailableRanches] = useState([])
  const [activeStateKey, setActiveStateKey] = useState("")
  const [openBreedSelectorKey, setOpenBreedSelectorKey] = useState("")
  const [openBracketKey, setOpenBracketKey] = useState("")
  const [draggingBracketCompositeKey, setDraggingBracketCompositeKey] = useState("")
  const [dragOverBracketCompositeKey, setDragOverBracketCompositeKey] = useState("")
  const [stateConfigs, setStateConfigs] = useState({})

  const availableStates = useMemo(() => {
    const statesMap = new Map()

    availableRanches.forEach((item) => {
      const key = normalizeStateValue(item.state)
      if (!key) return

      const current = statesMap.get(key)
      if (current) {
        current.ranches.push(item)
      } else {
        statesMap.set(key, {
          key,
          label: String(item.state).trim(),
          ranches: [item],
        })
      }
    })

    return Array.from(statesMap.values()).sort((a, b) => a.label.localeCompare(b.label))
  }, [availableRanches])

  const ensureStateLoaded = useCallback(async (stateKey) => {
    if (!token || !stateKey) return

    const existing = stateConfigs[stateKey]
    if (existing?.loaded || existing?.loading) return

    const stateInfo = availableStates.find((item) => item.key === stateKey)
    if (!stateInfo || stateInfo.ranches.length === 0) return

    setStateConfigs((prev) => ({
      ...prev,
      [stateKey]: {
        ...(prev[stateKey] || createDefaultStateConfig()),
        loading: true,
      },
    }))

    try {
      const ranchDetails = await Promise.all(
        stateInfo.ranches.map((item) => getRanchById(item.id, token))
      )

      const normalizedByRanch = ranchDetails.map((item) => removeBracketDescriptions(item?.weightCategories))
      const signatures = normalizedByRanch.map((items) => JSON.stringify(items))
      const hasMixed = new Set(signatures).size > 1
      const sourceBrackets = normalizedByRanch[0] || DEFAULT_WEIGHT_BRACKETS

      setStateConfigs((prev) => ({
        ...prev,
        [stateKey]: {
          loaded: true,
          loading: false,
          saving: false,
          hasMixed,
          baselineBrackets: sourceBrackets,
          brackets: sourceBrackets,
        },
      }))
    } catch (error) {
      console.error("Error loading weight brackets:", error)
      showError("Could not load weight brackets.")
      setStateConfigs((prev) => ({
        ...prev,
        [stateKey]: {
          ...(prev[stateKey] || createDefaultStateConfig()),
          loaded: true,
          loading: false,
        },
      }))
    }
  }, [token, stateConfigs, availableStates, showError])

  useEffect(() => {
    if (!token) {
      setBreedOptions([])
      setLoadingBreeds(false)
      return
    }

    const fetchBreeds = async () => {
      try {
        setLoadingBreeds(true)
        const data = await getBreeds(token)
        const options = Array.isArray(data)
          ? Array.from(
            data.reduce((accumulator, item) => {
              const value = normalizeBreedValue(item?.name)
              if (!value) return accumulator
              const key = value.toLowerCase()
              if (!accumulator.has(key)) accumulator.set(key, value)
              return accumulator
            }, new Map()).values()
          ).sort((a, b) => a.localeCompare(b))
          : []
        setBreedOptions(options)
      } catch (error) {
        console.error("Error loading breeds for weight brackets:", error)
        showError("Could not load breeds.")
      } finally {
        setLoadingBreeds(false)
      }
    }

    fetchBreeds()
  }, [token, showError])

  useEffect(() => {
    if (!token) return

    const fetchRanches = async () => {
      try {
        setLoadingRanches(true)
        const data = await getRanches(token)
        const ranchList = Array.isArray(data) ? data : []
        setAvailableRanches(ranchList)

        if (ranchList.length === 0) {
          setActiveStateKey("")
          return
        }

        const statesMap = new Map()
        ranchList.forEach((item) => {
          const key = normalizeStateValue(item.state)
          if (!key) return
          if (!statesMap.has(key)) statesMap.set(key, String(item.state).trim())
        })

        setActiveStateKey((prev) => (prev && statesMap.has(prev) ? prev : ""))
      } catch (error) {
        console.error("Error loading ranches for weight brackets:", error)
      } finally {
        setLoadingRanches(false)
      }
    }

    fetchRanches()
  }, [token, ranch?.id, ranch?.state])

  useEffect(() => {
    if (!activeStateKey) return
    ensureStateLoaded(activeStateKey)
  }, [activeStateKey, ensureStateLoaded])

  const hasChanges = (stateKey) => {
    const config = stateConfigs[stateKey]
    if (!config) return false

    const baseline = JSON.stringify(normalizeWeightBrackets(config.baselineBrackets))
    const current = JSON.stringify(normalizeWeightBrackets(config.brackets))
    return baseline !== current
  }

  const updateBracketsForState = (stateKey, updater) => {
    setStateConfigs((prev) => {
      const current = prev[stateKey]
      if (!current || !current.loaded) return prev

      return {
        ...prev,
        [stateKey]: {
          ...current,
          brackets: updater(current.brackets),
        },
      }
    })
  }

  const setBracketField = (stateKey, index, key, value) => {
    updateBracketsForState(stateKey, (brackets) => brackets.map((item, idx) => (
      idx === index
        ? { ...item, [key]: key === "min" || key === "max" ? (value === "" ? null : Number(value)) : value }
        : item
    )))
  }

  const getNextCategoryLabel = (brackets) => {
    const existing = new Set(
      groupBracketsByCategory(brackets)
        .map((group) => normalizeCategoryLabel(group.categoryLabel).toLowerCase())
    )

    let index = 1
    let label = `Category ${index}`
    while (existing.has(label.toLowerCase())) {
      index += 1
      label = `Category ${index}`
    }
    return label
  }

  const addBracket = (stateKey, categoryLabel = DEFAULT_CATEGORY_LABEL) => {
    const normalizedCategoryLabel = normalizeCategoryLabel(categoryLabel)
    let createdBracketStorageKey = ""
    updateBracketsForState(stateKey, (brackets) => {
      const currentCount = Array.isArray(brackets) ? brackets.length : 0
      const draftBracket = createWeightBracket(currentCount)
      const bracketStorageKey = buildBracketCategoryKey(
        normalizedCategoryLabel,
        getBracketBaseKey(draftBracket, currentCount),
        currentCount
      )
      createdBracketStorageKey = bracketStorageKey
      return [...brackets, { ...draftBracket, key: bracketStorageKey }]
    })

    if (createdBracketStorageKey) {
      setOpenBracketKey(`${stateKey}-${createdBracketStorageKey}`)
    }
  }

  const addCategory = (stateKey) => {
    let createdBracketStorageKey = ""
    updateBracketsForState(stateKey, (brackets) => {
      const currentBrackets = Array.isArray(brackets) ? brackets : []
      const newCategoryLabel = getNextCategoryLabel(currentBrackets)
      const currentCount = currentBrackets.length
      const draftBracket = createWeightBracket(currentCount)
      const bracketStorageKey = buildBracketCategoryKey(
        newCategoryLabel,
        getBracketBaseKey(draftBracket, currentCount),
        currentCount
      )
      createdBracketStorageKey = bracketStorageKey
      return [...currentBrackets, { ...draftBracket, key: bracketStorageKey }]
    })
    if (createdBracketStorageKey) {
      setOpenBracketKey(`${stateKey}-${createdBracketStorageKey}`)
    }
  }

  const renameCategoryForState = (stateKey, sourceCategoryLabel, targetCategoryLabel) => {
    const source = normalizeCategoryLabel(sourceCategoryLabel)
    const target = normalizeCategoryLabel(targetCategoryLabel)
    if (!source || !target || source === target) return

    updateBracketsForState(stateKey, (brackets) => brackets.map((item, index) => {
      const currentCategory = getBracketCategoryLabel(item, index)
      if (currentCategory !== source) return item
      return {
        ...item,
        key: buildBracketCategoryKey(target, getBracketBaseKey(item, index), index),
      }
    }))
    setOpenBracketKey("")
    setOpenBreedSelectorKey("")
    clearDragState()
  }

  const removeCategoryForState = (stateKey, categoryLabel) => {
    const targetCategory = normalizeCategoryLabel(categoryLabel)
    const categoryBracketKeys = new Set(
      (stateConfigs[stateKey]?.brackets || [])
        .map((item, index) => ({ bracketKey: getBracketKey(item, index), category: getBracketCategoryLabel(item, index) }))
        .filter((item) => item.category === targetCategory)
        .map((item) => item.bracketKey)
    )

    if (categoryBracketKeys.size === 0) return

    updateBracketsForState(stateKey, (brackets) => brackets.filter((item, index) => (
      getBracketCategoryLabel(item, index) !== targetCategory
    )))

    if (openBracketKey.startsWith(`${stateKey}-`)) {
      const openKey = openBracketKey.slice(`${stateKey}-`.length)
      if (categoryBracketKeys.has(openKey)) setOpenBracketKey("")
    }
    if (openBreedSelectorKey.startsWith(`${stateKey}-`)) {
      const openSelector = openBreedSelectorKey.slice(`${stateKey}-`.length)
      if (categoryBracketKeys.has(openSelector)) setOpenBreedSelectorKey("")
    }
    if (draggingBracketCompositeKey || dragOverBracketCompositeKey) {
      const dragging = parseCompositeBracketKey(draggingBracketCompositeKey)
      const dragOver = parseCompositeBracketKey(dragOverBracketCompositeKey)
      if (
        (dragging.stateKey === stateKey && categoryBracketKeys.has(dragging.bracketKey)) ||
        (dragOver.stateKey === stateKey && categoryBracketKeys.has(dragOver.bracketKey))
      ) {
        clearDragState()
      }
    }
  }

  const removeBracket = (stateKey, index) => {
    const bracketItem = stateConfigs[stateKey]?.brackets?.[index]
    const bracketKey = getBracketKey(bracketItem, index)
    const selectorKey = `${stateKey}-${bracketKey || index}`
    updateBracketsForState(stateKey, (brackets) => brackets.filter((_, idx) => idx !== index))
    if (openBracketKey === selectorKey) {
      setOpenBracketKey("")
    }
    const compositeKey = buildCompositeBracketKey(stateKey, bracketKey)
    if (draggingBracketCompositeKey === compositeKey || dragOverBracketCompositeKey === compositeKey) {
      clearDragState()
    }
  }

  const removeEmptyBracketsForState = (stateKey) => {
    setStateConfigs((prev) => {
      const current = prev[stateKey]
      if (!current || !current.loaded) return prev

      const cleaned = pruneEmptyBracketDrafts(current.brackets)
      if (cleaned.length === current.brackets.length) return prev

      return {
        ...prev,
        [stateKey]: {
          ...current,
          brackets: cleaned,
        },
      }
    })
  }

  const handleAddBracketForState = async (stateKey, categoryLabel = DEFAULT_CATEGORY_LABEL) => {
    setActiveStateKey(stateKey)
    await ensureStateLoaded(stateKey)
    addBracket(stateKey, categoryLabel)
  }

  const handleAddCategoryForState = async (stateKey) => {
    setActiveStateKey(stateKey)
    await ensureStateLoaded(stateKey)
    addCategory(stateKey)
  }

  const toggleBracketBreed = (stateKey, index, breedName) => {
    const targetValue = normalizeBreedValue(breedName)
    if (!targetValue) return

    updateBracketsForState(stateKey, (brackets) => brackets.map((item, idx) => {
      if (idx !== index) return item

      const currentBreeds = Array.isArray(item?.breeds)
        ? item.breeds.map((entry) => normalizeBreedValue(entry)).filter(Boolean)
        : []
      const exists = currentBreeds.some((entry) => entry.toLowerCase() === targetValue.toLowerCase())

      return {
        ...item,
        breeds: exists
          ? currentBreeds.filter((entry) => entry.toLowerCase() !== targetValue.toLowerCase())
          : [...currentBreeds, targetValue],
      }
    }))
  }

  const clearBracketBreeds = (stateKey, index) => {
    updateBracketsForState(stateKey, (brackets) => brackets.map((item, idx) => (
      idx === index ? { ...item, breeds: [] } : item
    )))
  }

  const moveBracketInState = (stateKey, sourceBracketKey, targetBracketKey) => {
    if (!sourceBracketKey || !targetBracketKey || sourceBracketKey === targetBracketKey) return

    updateBracketsForState(stateKey, (brackets) => {
      const sourceIndex = brackets.findIndex((item, index) => getBracketKey(item, index) === sourceBracketKey)
      const targetIndex = brackets.findIndex((item, index) => getBracketKey(item, index) === targetBracketKey)
      if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return brackets

      const reordered = [...brackets]
      const [moved] = reordered.splice(sourceIndex, 1)
      reordered.splice(targetIndex, 0, moved)
      return reordered
    })
  }

  const buildCompositeBracketKey = (stateKey, bracketKey) => `${stateKey}::${bracketKey}`

  const parseCompositeBracketKey = (compositeKey) => {
    const [stateKey, ...rest] = String(compositeKey || "").split("::")
    return {
      stateKey,
      bracketKey: rest.join("::"),
    }
  }

  const clearDragState = () => {
    setDraggingBracketCompositeKey("")
    setDragOverBracketCompositeKey("")
  }

  const handleBracketDragStart = (event, stateKey, bracketKey) => {
    const compositeKey = buildCompositeBracketKey(stateKey, bracketKey)
    setDraggingBracketCompositeKey(compositeKey)
    setDragOverBracketCompositeKey(compositeKey)
    if (event?.dataTransfer) {
      event.dataTransfer.effectAllowed = "move"
      event.dataTransfer.setData("text/plain", compositeKey)
    }
  }

  const handleBracketDragOver = (event, stateKey, bracketKey) => {
    if (!draggingBracketCompositeKey) return
    event.preventDefault()
    if (event?.dataTransfer) {
      event.dataTransfer.dropEffect = "move"
    }

    const source = parseCompositeBracketKey(draggingBracketCompositeKey)
    if (source.stateKey === stateKey && source.bracketKey && source.bracketKey !== bracketKey) {
      moveBracketInState(stateKey, source.bracketKey, bracketKey)
    }

    const compositeKey = buildCompositeBracketKey(stateKey, bracketKey)
    if (dragOverBracketCompositeKey !== compositeKey) {
      setDragOverBracketCompositeKey(compositeKey)
    }
  }

  const handleBracketDrop = (event, stateKey, targetBracketKey) => {
    event.preventDefault()
    const fallback = event?.dataTransfer?.getData("text/plain") || ""
    const sourceCompositeKey = draggingBracketCompositeKey || fallback
    const source = parseCompositeBracketKey(sourceCompositeKey)

    if (source.stateKey === stateKey && source.bracketKey) {
      moveBracketInState(stateKey, source.bracketKey, targetBracketKey)
    }

    clearDragState()
  }

  const handleSaveStateBrackets = async (stateKey) => {
    if (!token || !stateKey) return

    const config = stateConfigs[stateKey]
    const stateInfo = availableStates.find((item) => item.key === stateKey)
    if (!config || !config.loaded || !stateInfo || stateInfo.ranches.length === 0 || config.saving) return

    try {
      setStateConfigs((prev) => ({
        ...prev,
        [stateKey]: {
          ...prev[stateKey],
          saving: true,
        },
      }))

      const cleanedDrafts = pruneEmptyBracketDrafts(config.brackets)
      const normalizedBrackets = removeBracketDescriptions(cleanedDrafts)
      const payload = { weightCategories: normalizedBrackets }
      // State-level layouts are synchronized in backend. One save updates all ranches in the state.
      const updatedStateSource = await updateRanch(stateInfo.ranches[0].id, payload, token)
      setAvailableRanches((prev) => Array.isArray(prev)
        ? prev.map((item) => (
          normalizeStateValue(item.state) === stateKey
            ? { ...item, weightCategories: normalizedBrackets }
            : item
        ))
        : prev
      )

      if (ranch?.id && normalizeStateValue(ranch.state) === stateKey) {
        setRanch((prev) => ({ ...(prev || {}), ...(updatedStateSource || {}), weightCategories: normalizedBrackets }))
      }

      setStateConfigs((prev) => ({
        ...prev,
        [stateKey]: {
          ...prev[stateKey],
          saving: false,
          hasMixed: false,
          baselineBrackets: normalizedBrackets,
          brackets: normalizedBrackets,
        },
      }))
      if (openBracketKey.startsWith(`${stateKey}-`)) {
        setOpenBracketKey("")
      }
      if (openBreedSelectorKey.startsWith(`${stateKey}-`)) {
        setOpenBreedSelectorKey("")
      }

      const ranchCount = stateInfo.ranches.length
      const ranchesText = ranchCount === 1 ? "ranch" : "ranches"
      showSuccess(`Weight brackets updated for ${ranchCount} ${ranchesText} in ${stateInfo.label}.`, "Saved")
    } catch (error) {
      console.error("Error saving weight brackets:", error)
      showError(error?.response?.data?.message || "Could not save weight brackets.")
      setStateConfigs((prev) => ({
        ...prev,
        [stateKey]: {
          ...prev[stateKey],
          saving: false,
        },
      }))
    }
  }

  return (
    <div className="w-full p-4 md:p-6 space-y-5">

      <div className="rounded-2xl border border-primary-border/60 bg-white p-5 shadow-sm">
        <p className="text-xs uppercase tracking-wide text-secondary">Catalogs</p>
        <h2 className="mt-1 text-xl font-semibold text-primary-text">Weight Brackets</h2>
        <p className="mt-1 text-sm text-secondary">
          Available states are listed below. Each state has its own brackets and add/save actions.
        </p>
      </div>

      <div className="rounded-2xl border border-primary-border/60 bg-white p-5 shadow-sm space-y-4">
        {loadingRanches ? (
          <p className="text-xs text-secondary">Loading ranches...</p>
        ) : availableStates.length === 0 ? (
          <p className="text-xs text-secondary">No states available.</p>
        ) : (
          <div className="space-y-3">
            {availableStates.map((stateInfo) => {
              const config = stateConfigs[stateInfo.key] || createDefaultStateConfig()
              const isActive = activeStateKey === stateInfo.key
              const stateHasChanges = hasChanges(stateInfo.key)
              const canSaveState = stateHasChanges || config.hasMixed
              const groupedBrackets = groupBracketsByCategory(config.brackets)

              return (
                <div key={stateInfo.key} className="rounded-xl border border-primary-border/60 bg-primary-border/5 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold text-primary-text">{stateInfo.label}</p>
                      <p className="text-xs text-secondary">{stateInfo.ranches.length} ranches</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (isActive) {
                            removeEmptyBracketsForState(stateInfo.key)
                            setActiveStateKey("")
                            return
                          }
                          setActiveStateKey(stateInfo.key)
                        }}
                        className="rounded-lg border border-primary-border/60 bg-white px-3 py-1.5 text-xs hover:bg-primary-border/15"
                      >
                        {isActive ? "Close" : "Manage"}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAddCategoryForState(stateInfo.key)}
                        className="rounded-lg border border-primary-border/60 bg-white px-3 py-1.5 text-xs hover:bg-primary-border/15"
                      >
                        Add Category
                      </button>
                    </div>
                  </div>

                  {isActive && (
                    <>
                      {!config.loaded || config.loading ? (
                        <p className="text-xs text-secondary">Loading brackets...</p>
                      ) : (
                        <>
                          {config.hasMixed && (
                            <div className="rounded-xl border border-amber-300 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                              Ranches in this state share one bracket layout. Saving here applies the same setup to every ranch in {stateInfo.label}.
                            </div>
                          )}

                          {groupedBrackets.length === 0 && (
                            <div className="rounded-xl border border-dashed border-primary-border/60 bg-white p-4 text-sm text-secondary">
                              No categories yet. Click <span className="font-semibold text-primary-text">Add Category</span> to create one before adding brackets.
                            </div>
                          )}

                          {groupedBrackets.map((group) => (
                            <div key={`${stateInfo.key}-${group.categoryLabel}`} className="rounded-xl border border-primary-border/55 bg-primary-border/5 p-3 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="min-w-[220px]">
                                  <label className="text-[11px] font-semibold uppercase tracking-wide text-secondary">Category</label>
                                  <input
                                    className="mt-1 w-full rounded-lg border border-primary-border/60 bg-white px-3 py-2 text-sm"
                                    defaultValue={group.categoryLabel}
                                    onBlur={(event) => renameCategoryForState(stateInfo.key, group.categoryLabel, event.target.value)}
                                    onKeyDown={(event) => {
                                      if (event.key === "Enter") event.currentTarget.blur()
                                    }}
                                  />
                                </div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleAddBracketForState(stateInfo.key, group.categoryLabel)}
                                    className="rounded-lg border border-primary-border/60 bg-white px-3 py-1.5 text-xs hover:bg-primary-border/15"
                                  >
                                    Add Bracket
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => removeCategoryForState(stateInfo.key, group.categoryLabel)}
                                    className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
                                  >
                                    Remove Category
                                  </button>
                                </div>
                              </div>

                              {group.items.map(({ bracket, index }, bracketIndex) => {
                                const bracketKey = getBracketKey(bracket, index)
                                const selectorKey = `${stateInfo.key}-${bracketKey}`
                                const compositeKey = buildCompositeBracketKey(stateInfo.key, bracketKey)
                                const selectedBreeds = Array.isArray(bracket?.breeds)
                                  ? bracket.breeds.map((item) => normalizeBreedValue(item)).filter(Boolean)
                                  : []
                                const hasSelectedBreeds = selectedBreeds.length > 0
                                const isBracketOpen = openBracketKey === selectorKey
                                const breedsLegend = getBreedsLegend(selectedBreeds)
                                const isDragOverTarget = dragOverBracketCompositeKey === compositeKey && draggingBracketCompositeKey !== compositeKey
                                const isDraggingCurrent = draggingBracketCompositeKey === compositeKey

                                return (
                                  <div
                                    key={bracketKey}
                                    className={`rounded-xl border p-4 space-y-3 transition-all duration-150 ${isDragOverTarget ? "border-action-blue/60 bg-action-blue/5" : "border-primary-border/50 bg-white"} ${isDraggingCurrent ? "opacity-70" : ""}`}
                                    onDragOver={(event) => handleBracketDragOver(event, stateInfo.key, bracketKey)}
                                    onDrop={(event) => handleBracketDrop(event, stateInfo.key, bracketKey)}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <button
                                        type="button"
                                        draggable
                                        onDragStart={(event) => handleBracketDragStart(event, stateInfo.key, bracketKey)}
                                        onDragEnd={clearDragState}
                                        className="shrink-0 cursor-grab rounded-md px-2 py-1 text-secondary hover:bg-primary-border/20 active:cursor-grabbing"
                                        title="Drag to reorder"
                                        aria-label="Drag to reorder"
                                      >
                                        <GripVertical className="h-4 w-4" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setOpenBracketKey((prev) => (prev === selectorKey ? "" : selectorKey))}
                                        className="flex w-full items-center justify-between gap-3 rounded-lg border border-primary-border/60 bg-white px-3 py-2 text-left hover:bg-primary-border/15"
                                      >
                                        <div className="min-w-0">
                                          <p className="text-xs font-semibold text-secondary uppercase tracking-wide">
                                            {String(bracket.label || "").trim()
                                              ? String(bracket.label || "").trim()
                                              : `Bracket ${bracketIndex + 1}`}
                                          </p>
                                          <p className="mt-0.5 truncate text-[11px] text-secondary">{breedsLegend}</p>
                                        </div>
                                        <ChevronDown className={`h-4 w-4 text-secondary transition-transform ${isBracketOpen ? "rotate-180" : ""}`} />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeBracket(stateInfo.key, index)}
                                        className="shrink-0 rounded-md border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                    {isBracketOpen && (
                                      <>
                                        <div className="grid grid-cols-1 gap-3">
                                          <div>
                                            <label className="text-xs font-semibold text-secondary">Label</label>
                                            <input
                                              className="mt-1 w-full rounded-lg border border-primary-border/60 px-3 py-2 text-sm"
                                              value={bracket.label || ""}
                                              onChange={(e) => setBracketField(stateInfo.key, index, "label", e.target.value)}
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-xs font-semibold text-secondary">Applies To Breeds</label>
                                          <div className="mt-1">
                                            <Popover
                                              open={openBreedSelectorKey === selectorKey}
                                              onOpenChange={(open) => setOpenBreedSelectorKey(open ? selectorKey : "")}
                                            >
                                              <PopoverTrigger asChild>
                                                <button
                                                  type="button"
                                                  className="w-full rounded-lg border border-primary-border/60 px-3 py-2 text-sm flex items-center justify-between"
                                                >
                                                  <span className={hasSelectedBreeds ? "text-primary-text" : "text-secondary"}>
                                                    {hasSelectedBreeds ? `${selectedBreeds.length} breeds selected` : "All breeds"}
                                                  </span>
                                                  <ChevronsUpDown className="h-4 w-4 text-secondary opacity-80" />
                                                </button>
                                              </PopoverTrigger>
                                              <PopoverContent className="p-0 w-[var(--radix-popover-trigger-width)] z-[80]" align="start">
                                                <Command>
                                                  <CommandInput placeholder="Search breed..." />
                                                  <CommandList>
                                                    <CommandEmpty>No breeds found.</CommandEmpty>
                                                    <CommandGroup>
                                                      <CommandItem
                                                        value="all-breeds"
                                                        onSelect={() => clearBracketBreeds(stateInfo.key, index)}
                                                      >
                                                        <Check className={`mr-2 h-4 w-4 ${hasSelectedBreeds ? "opacity-0" : "opacity-100"}`} />
                                                        All breeds
                                                      </CommandItem>
                                                      {breedOptions.map((breedName) => {
                                                        const isSelected = selectedBreeds.some(
                                                          (entry) => entry.toLowerCase() === breedName.toLowerCase()
                                                        )
                                                        return (
                                                          <CommandItem
                                                            key={breedName}
                                                            value={breedName}
                                                            onSelect={() => toggleBracketBreed(stateInfo.key, index, breedName)}
                                                          >
                                                            <Check className={`mr-2 h-4 w-4 ${isSelected ? "opacity-100" : "opacity-0"}`} />
                                                            {breedName}
                                                          </CommandItem>
                                                        )
                                                      })}
                                                    </CommandGroup>
                                                  </CommandList>
                                                </Command>
                                              </PopoverContent>
                                            </Popover>
                                          </div>
                                          {loadingBreeds ? (
                                            <p className="mt-1 text-[11px] text-secondary">Loading breeds...</p>
                                          ) : breedOptions.length === 0 ? (
                                            <p className="mt-1 text-[11px] text-secondary">No breeds in catalog yet. This bracket will apply to all breeds.</p>
                                          ) : hasSelectedBreeds ? (
                                            <p className="mt-1 text-[11px] text-secondary">{selectedBreeds.join(", ")}</p>
                                          ) : (
                                            <p className="mt-1 text-[11px] text-secondary">Applies to every breed.</p>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          <div>
                                            <label className="text-xs font-semibold text-secondary">Min Weight (lb)</label>
                                            <input
                                              type="number"
                                              className="mt-1 w-full rounded-lg border border-primary-border/60 px-3 py-2 text-sm"
                                              value={bracket.min ?? ""}
                                              onChange={(e) => setBracketField(stateInfo.key, index, "min", e.target.value)}
                                              placeholder="No minimum"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-xs font-semibold text-secondary">Max Weight (lb)</label>
                                            <input
                                              type="number"
                                              className="mt-1 w-full rounded-lg border border-primary-border/60 px-3 py-2 text-sm"
                                              value={bracket.max ?? ""}
                                              onChange={(e) => setBracketField(stateInfo.key, index, "max", e.target.value)}
                                              placeholder="No maximum"
                                            />
                                          </div>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                )
                              })}
                            </div>
                          ))}

                          <div className="flex justify-end border-t border-primary-border/40 pt-3">
                            <button
                              type="button"
                              disabled={config.saving || !canSaveState}
                              onClick={() => handleSaveStateBrackets(stateInfo.key)}
                              className="rounded-xl border border-action-blue/80 bg-action-blue px-4 py-2 text-sm font-medium text-white hover:bg-action-blue/90 disabled:opacity-60"
                            >
                              {config.saving ? "Saving..." : `Save ${stateInfo.label}`}
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default WeightBracketsSettings
