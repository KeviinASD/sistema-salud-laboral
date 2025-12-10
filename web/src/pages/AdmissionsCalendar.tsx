import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { api } from "../api";
import AppLayout from "../components/Layout/AppLayout";

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end: string;
  backgroundColor: string;
  borderColor: string;
  extendedProps: {
    tipo_examen: string;
    estado: string;
    medico?: string;
  };
}

export default function AdmissionsCalendar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"month" | "week" | "day">("month");
  const [selectedDoctor, setSelectedDoctor] = useState<string>("");
  const [doctors, setDoctors] = useState<any[]>([]);

  useEffect(() => {
    loadDoctors();
    loadEvents();
  }, [currentDate, selectedDoctor]);

  const loadDoctors = async () => {
    try {
      const res = await api.get("/users?rol=doctor");
      setDoctors(res.data?.data || []);
    } catch (error) {
      console.error("Error cargando doctores:", error);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    try {
      const start = getStartOfPeriod();
      const end = getEndOfPeriod();
      
      const params: any = {
        start: start.toISOString(),
        end: end.toISOString()
      };
      
      if (selectedDoctor) {
        params.medico_id = selectedDoctor;
      }

      const res = await api.get("/admissions/calendar/events", { params });
      setEvents(res.data || []);
    } catch (error) {
      console.error("Error cargando eventos:", error);
    } finally {
      setLoading(false);
    }
  };

  const getStartOfPeriod = () => {
    const date = new Date(currentDate);
    if (view === "month") {
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
    } else if (view === "week") {
      const day = date.getDay();
      date.setDate(date.getDate() - day);
      date.setHours(0, 0, 0, 0);
    } else {
      date.setHours(0, 0, 0, 0);
    }
    return date;
  };

  const getEndOfPeriod = () => {
    const date = new Date(currentDate);
    if (view === "month") {
      date.setMonth(date.getMonth() + 1);
      date.setDate(0);
      date.setHours(23, 59, 59, 999);
    } else if (view === "week") {
      date.setDate(date.getDate() + (6 - date.getDay()));
      date.setHours(23, 59, 59, 999);
    } else {
      date.setHours(23, 59, 59, 999);
    }
    return date;
  };

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(currentDate);
    if (view === "month") {
      newDate.setMonth(newDate.getMonth() + (direction === "next" ? 1 : -1));
    } else if (view === "week") {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 7 : -7));
    } else {
      newDate.setDate(newDate.getDate() + (direction === "next" ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();

    const days: (Date | null)[] = [];
    
    // Días del mes anterior
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null);
    }
    
    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(new Date(year, month, day));
    }
    
    return days;
  };

  const getEventsForDate = (date: Date | null) => {
    if (!date) return [];
    const dateStr = date.toISOString().split("T")[0];
    return events.filter(event => {
      const eventDate = new Date(event.start).toISOString().split("T")[0];
      return eventDate === dateStr;
    });
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("es-PE", { 
      weekday: "long", 
      year: "numeric", 
      month: "long", 
      day: "numeric" 
    });
  };

  return (
    <AppLayout>
      <div className="py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-6 xl:px-8">
          <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Calendario de Citas</h1>
              <p className="mt-1 text-sm sm:text-base text-gray-600 dark:text-gray-400">Visualización y gestión de turnos programados</p>
            </div>
            <button
              onClick={() => navigate("/admisiones/nueva")}
              className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm sm:text-base"
            >
              ➕ Nueva Cita
            </button>
          </div>

          {/* Controles */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 sm:p-4 mb-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateDate("prev")}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  ← Anterior
                </button>
                <button
                  onClick={goToToday}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Hoy
                </button>
                <button
                  onClick={() => navigateDate("next")}
                  className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Siguiente →
                </button>
                <span className="ml-4 font-medium text-gray-900 dark:text-white">
                  {formatDate(currentDate)}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4">
                <select
                  value={view}
                  onChange={(e) => setView(e.target.value as any)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                >
                  <option value="month">Mes</option>
                  <option value="week">Semana</option>
                  <option value="day">Día</option>
                </select>

                <select
                  value={selectedDoctor}
                  onChange={(e) => setSelectedDoctor(e.target.value)}
                  className="px-3 py-1.5 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">Todos los médicos</option>
                  {doctors.map(doctor => (
                    <option key={doctor.id} value={doctor.id}>
                      Dr. {doctor.nombres} {doctor.apellidos}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Calendario */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Cargando calendario...</p>
            </div>
          ) : view === "month" ? (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="grid grid-cols-7 border-b">
                {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map(day => (
                  <div key={day} className="p-2 text-center font-medium text-gray-700 bg-gray-50">
                    {day}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {getDaysInMonth().map((date, index) => {
                  const dayEvents = getEventsForDate(date);
                  const isToday = date && 
                    date.toDateString() === new Date().toDateString();
                  const isCurrentMonth = date && 
                    date.getMonth() === currentDate.getMonth();

                  return (
                    <div
                      key={index}
                      className={`min-h-24 border border-gray-200 p-2 ${
                        !isCurrentMonth ? "bg-gray-50 dark:bg-gray-700" : "bg-white dark:bg-gray-800"
                      } ${isToday ? "bg-blue-50 border-blue-300" : ""}`}
                    >
                      {date && (
                        <>
                          <div className={`text-sm font-medium mb-1 ${
                            isToday ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white"
                          }`}>
                            {date.getDate()}
                          </div>
                          <div className="space-y-1">
                            {dayEvents.slice(0, 3).map(event => (
                              <div
                                key={event.id}
                                onClick={() => navigate(`/admisiones/${event.id}`)}
                                className="text-xs p-1 rounded cursor-pointer hover:opacity-80"
                                style={{
                                  backgroundColor: event.backgroundColor,
                                  color: "white"
                                }}
                                title={event.title}
                              >
                                {new Date(event.start).toLocaleTimeString("es-PE", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })} - {event.title.substring(0, 15)}
                              </div>
                            ))}
                            {dayEvents.length > 3 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                +{dayEvents.length - 3} más
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-4">
                {events.length === 0 ? (
                  <p className="text-center text-gray-500 py-8">
                    No hay citas programadas para este período
                  </p>
                ) : (
                  events.map(event => (
                    <div
                      key={event.id}
                      onClick={() => navigate(`/admisiones/${event.id}`)}
                      className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium text-gray-900">{event.title}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(event.start).toLocaleString("es-PE")}
                          </p>
                          <p className="text-sm text-gray-500">
                            Tipo: {event.extendedProps.tipo_examen}
                            {event.extendedProps.medico && ` • Médico: ${event.extendedProps.medico}`}
                          </p>
                        </div>
                        <span
                          className="px-3 py-1 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: event.backgroundColor }}
                        >
                          {event.extendedProps.estado}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Leyenda */}
          <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Leyenda</h3>
            <div className="flex flex-wrap gap-4">
              <div className="flex items-center">
                <div className="w-4 h-4 bg-blue-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Programado</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-green-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Completado</span>
              </div>
              <div className="flex items-center">
                <div className="w-4 h-4 bg-red-500 rounded mr-2"></div>
                <span className="text-sm text-gray-600 dark:text-gray-400">Cancelado</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

