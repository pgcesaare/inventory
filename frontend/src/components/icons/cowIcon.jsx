const CowIcon = ({ className = "h-4 w-4" }) => {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M3.5 11.2C3.5 9.7 4.7 8.5 6.2 8.5H11.8C13.1 8.5 14.2 7.6 14.5 6.4L14.8 5.3C14.9 4.9 15.3 4.7 15.6 4.8L17.9 5.5C18.2 5.6 18.4 5.9 18.4 6.2V8.7H20.1C20.9 8.7 21.5 9.3 21.5 10.1V12.9C21.5 13.7 20.9 14.3 20.1 14.3H18.4V16.1C18.4 16.7 17.9 17.2 17.3 17.2H15.9V18.8C15.9 19.4 15.4 19.9 14.8 19.9C14.2 19.9 13.7 19.4 13.7 18.8V17.2H8.3V18.8C8.3 19.4 7.8 19.9 7.2 19.9C6.6 19.9 6.1 19.4 6.1 18.8V17.2H4.7C4.1 17.2 3.6 16.7 3.6 16.1L3.5 11.2Z"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.4 10.8L20.7 9.9M6.8 12.5H11.2"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="6.8" cy="10.8" r="0.85" fill="currentColor" />
    </svg>
  )
}

export default CowIcon
