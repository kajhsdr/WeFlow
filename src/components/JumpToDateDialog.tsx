import React, { useState } from 'react'
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import './JumpToDateDialog.scss'

interface JumpToDateDialogProps {
    isOpen: boolean
    onClose: () => void
    onSelect: (date: Date) => void
    currentDate?: Date
}

const JumpToDateDialog: React.FC<JumpToDateDialogProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentDate = new Date()
}) => {
    const [calendarDate, setCalendarDate] = useState(new Date(currentDate))
    const [selectedDate, setSelectedDate] = useState(new Date(currentDate))

    if (!isOpen) return null

    const getDaysInMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        return new Date(year, month + 1, 0).getDate()
    }

    const getFirstDayOfMonth = (date: Date) => {
        const year = date.getFullYear()
        const month = date.getMonth()
        return new Date(year, month, 1).getDay()
    }

    const generateCalendar = () => {
        const daysInMonth = getDaysInMonth(calendarDate)
        const firstDay = getFirstDayOfMonth(calendarDate)
        const days: (number | null)[] = []

        for (let i = 0; i < firstDay; i++) {
            days.push(null)
        }

        for (let i = 1; i <= daysInMonth; i++) {
            days.push(i)
        }

        return days
    }

    const handleDateClick = (day: number) => {
        const newDate = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), day)
        setSelectedDate(newDate)
    }

    const handleConfirm = () => {
        onSelect(selectedDate)
        onClose()
    }

    const isToday = (day: number) => {
        const today = new Date()
        return day === today.getDate() &&
            calendarDate.getMonth() === today.getMonth() &&
            calendarDate.getFullYear() === today.getFullYear()
    }

    const isSelected = (day: number) => {
        return day === selectedDate.getDate() &&
            calendarDate.getMonth() === selectedDate.getMonth() &&
            calendarDate.getFullYear() === selectedDate.getFullYear()
    }

    const weekdays = ['日', '一', '二', '三', '四', '五', '六']
    const days = generateCalendar()

    return (
        <div className="jump-date-overlay" onClick={onClose}>
            <div className="jump-date-modal" onClick={e => e.stopPropagation()}>
                <div className="jump-date-header">
                    <div className="title-area">
                        <CalendarIcon size={18} />
                        <h3>跳转到日期</h3>
                    </div>
                    <button className="close-btn" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                <div className="calendar-view">
                    <div className="calendar-nav">
                        <button
                            className="nav-btn"
                            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                        >
                            <ChevronLeft size={18} />
                        </button>
                        <span className="current-month">
                            {calendarDate.getFullYear()}年{calendarDate.getMonth() + 1}月
                        </span>
                        <button
                            className="nav-btn"
                            onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                        >
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <div className="calendar-grid">
                        <div className="weekdays">
                            {weekdays.map(d => <div key={d} className="weekday">{d}</div>)}
                        </div>
                        <div className="days">
                            {days.map((day, i) => (
                                <div
                                    key={i}
                                    className={`day-cell ${day === null ? 'empty' : ''} ${day !== null && isSelected(day) ? 'selected' : ''} ${day !== null && isToday(day) ? 'today' : ''}`}
                                    onClick={() => day !== null && handleDateClick(day)}
                                >
                                    {day}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="quick-options">
                    <button onClick={() => {
                        const d = new Date()
                        setSelectedDate(d)
                        setCalendarDate(new Date(d))
                    }}>今天</button>
                    <button onClick={() => {
                        const d = new Date()
                        d.setDate(d.getDate() - 7)
                        setSelectedDate(d)
                        setCalendarDate(new Date(d))
                    }}>一周前</button>
                    <button onClick={() => {
                        const d = new Date()
                        d.setMonth(d.getMonth() - 1)
                        setSelectedDate(d)
                        setCalendarDate(new Date(d))
                    }}>一月前</button>
                </div>

                <div className="dialog-footer">
                    <button className="cancel-btn" onClick={onClose}>取消</button>
                    <button className="confirm-btn" onClick={handleConfirm}>跳转</button>
                </div>
            </div>
        </div>
    )
}

export default JumpToDateDialog
