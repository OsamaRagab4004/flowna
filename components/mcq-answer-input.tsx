"use client"

interface MCQAnswerInputProps {
  options: string[]
  selectedOption: number | undefined
  onOptionSelect: (index: number) => void
  disabled?: boolean
}

export default function MCQAnswerInput({
  options,
  selectedOption,
  onOptionSelect,
  disabled = false,
}: MCQAnswerInputProps) {
  return (
    <div className="space-y-3">
      {options.map((option, index) => {
        const isSelected = selectedOption === index
        
        return (
          <button
            key={index}
            onClick={() => !disabled && onOptionSelect(index)}
            disabled={disabled}
            className={`
              w-full p-4 text-left rounded-lg border-2 transition-all duration-200 font-medium
              ${isSelected 
                ? 'bg-gradient-to-r from-blue-500 to-indigo-500 text-white border-blue-500 shadow-lg transform scale-[1.02]' 
                : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:shadow-md'}
            `}
          >
            <div className="flex items-center justify-between">
              <span className="text-base leading-relaxed">{option}</span>
              <div className={`
                w-5 h-5 rounded-full border-2 flex items-center justify-center
                ${isSelected 
                  ? 'border-white bg-white' 
                  : 'border-gray-300 dark:border-gray-600'
                }
              `}>
                {isSelected && (
                  <div className="w-2.5 h-2.5 rounded-full bg-blue-500"></div>
                )}
              </div>
            </div>
          </button>
        )
      })}
    </div>
  )
}
