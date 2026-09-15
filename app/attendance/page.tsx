'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Plus,
  Download,
  MoreHorizontal,
  Search,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { AddEmployeeModal } from '../modals/AddEmployeeModal';
// --- Types ---
export interface MonthlyAttendance {
  month: string;
  oneTime: number;
  late: number;
  absent: number;
}

export interface EmployeeTypeDistribution {
  name: string;
  value: number;
  color: string;
}



export interface EmployeeAttendanceRecord {
  id: string;
  first_name: string;
  last_name: string;
  display_name?: string;
  profile_photo_url?: string | null;
  employee_code?: string;
  daily_attendance: Record<number | string, 'present' | 'half_day' | 'late' | 'absent' | 'on_leave' | null>;
}

interface AttendanceDashboardProps {
  onDownloadReport?: () => void;
  apiEndpoint?: string; 
}

export default function AttendanceDashboard({
  onDownloadReport,
  apiEndpoint = '/api/v1/attendance',
}: AttendanceDashboardProps) {
  const [formattedDate, setFormattedDate] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const m = new Date().getMonth() + 1;
    return String(m).padStart(2, '0');
  });

  const {token, roles} = useAuth();
  const hasHrRole = roles.includes("hr");
  console.log("Role hr :", hasHrRole);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  const handleOpenAddModal=()=>{
     setIsModalOpen(true);
  }

  // Fetching States
  const [employeesAttendanceList, setEmployeesAttendanceList] = useState<EmployeeAttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Dynamic Date Header
  useEffect(() => {
    const today = new Date();
    const formatted = today.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
    setFormattedDate(`Today, ${formatted}`);
  }, []);

  // Fetch Data function
  const fetchAttendanceData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const monthStr = `${selectedYear}-${selectedMonth}`;
      const res = await fetch(`${apiEndpoint}?month=${monthStr}`, {
         headers:{
            Authorization:`Bearer ${token}`
         }
      });
      
      if (!res.ok) {
        throw new Error(`Failed to fetch attendance data (${res.status})`);
      }

      const json = await res.json();
      const attendanceRecords = json?.data?.data || json?.data || json;
      
      if (Array.isArray(attendanceRecords)) {
        setEmployeesAttendanceList(attendanceRecords);
      }  else {
        throw new Error(json.message || 'Invalid response format received from server');
      }
    } catch (err: any) {
      console.error('Error fetching attendance:', err);
      setError(err.message || 'Unable to load attendance records');
    } finally {
      setIsLoading(false);
    }
  }, [apiEndpoint, selectedYear, selectedMonth]);

  // Fetch when Year/Month changes
  useEffect(() => {
    fetchAttendanceData();
  }, [fetchAttendanceData]);

  // Derive Dynamic Charts from Fetched Attendance Data
  const { monthlyAttendanceData, employeeTypeData } = useMemo(() => {
    if (!employeesAttendanceList.length) {
      return { monthlyAttendanceData: [], employeeTypeData: [] };
    }

    let totalPresent = 0;
    let totalLate = 0;
    let totalAbsent = 0;
    let totalRecords = 0;

    employeesAttendanceList.forEach((emp) => {
      if (emp.daily_attendance) {
        Object.values(emp.daily_attendance).forEach((status) => {
          if (status === 'present') totalPresent++;
          else if (status === 'late') totalLate++;
          else if (status === 'absent' || status === 'on_leave') totalAbsent++;
          if (status) totalRecords++;
        });
      }
    });

    const presentPct = totalRecords ? Math.round((totalPresent / totalRecords) * 100) : 0;
    const latePct = totalRecords ? Math.round((totalLate / totalRecords) * 100) : 0;
    const absentPct = totalRecords ? Math.round((totalAbsent / totalRecords) * 100) : 0;

    const currentMonthLabel = new Date(
      parseInt(selectedYear),
      parseInt(selectedMonth) - 1
    ).toLocaleString('en-US', { month: 'short' });

    const barData: MonthlyAttendance[] = [
      {
        month: currentMonthLabel,
        oneTime: presentPct,
        late: latePct,
        absent: absentPct,
      },
    ];

    const pieData: EmployeeTypeDistribution[] = [
      {
        name: 'Active Staff',
        value: employeesAttendanceList.length,
        color: '#3b82f6',
      },
    ];

    return { monthlyAttendanceData: barData, employeeTypeData: pieData };
  }, [employeesAttendanceList, selectedYear, selectedMonth]);

  const totalEmployees = employeesAttendanceList.length;

  // Filter employees by search term
  const filteredEmployees = useMemo(() => {
    return employeesAttendanceList.filter((emp) => {
      const fullName = `${emp.first_name || ''} ${emp.last_name || ''}`.toLowerCase();
      const code = (emp.employee_code || '').toLowerCase();
      const displayName = (emp.display_name || '').toLowerCase();
      const query = searchTerm.toLowerCase();

      return fullName.includes(query) || code.includes(query) || displayName.includes(query);
    });
  }, [employeesAttendanceList, searchTerm]);

  // Pagination logic
  const totalEntries = filteredEmployees.length;
  const totalPages = Math.ceil(totalEntries / itemsPerPage) || 1;
  const startIdx = (currentPage - 1) * itemsPerPage;
  const currentEmployees = filteredEmployees.slice(startIdx, startIdx + itemsPerPage);

  // Calculate actual days in selected month/year
  const daysInMonthCount = new Date(parseInt(selectedYear), parseInt(selectedMonth), 0).getDate();
  const daysInMonth = Array.from({ length: daysInMonthCount }, (_, i) => i + 1);

  // Status Icon Renderer
  const renderStatusIcon = (status: 'present' | 'late' | 'absent' | 'on_leave'|'half_day' | null) => {
    switch (status) {
      case 'present':
        return <CheckCircle2 className="w-5 h-5 text-blue-500 fill-blue-50 shrink-0" />;
      case 'late':
        return <CheckCircle2 className="w-5 h-5 text-orange-500 fill-orange-50 shrink-0" />;
      case 'absent':
      case 'on_leave':
        return <XCircle className="w-5 h-5 text-red-500 fill-red-50 shrink-0" />;
      default:
        return <span className="text-slate-300 font-light">-</span>;
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans">
      <main className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Top Title Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              {formattedDate || 'Today'}
            </h1>
            <p className="text-xs text-slate-400 font-medium mt-1">
              Dashboard / <span className="text-slate-600">Attendance</span>
            </p>
          </div>
          {hasHrRole && (
             <button
            onClick={handleOpenAddModal}
            className="inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-4 py-2 rounded-xl text-sm transition-colors shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Add Employee
          </button>
          )}
        </div>

        <AddEmployeeModal 
           isOpen={isModalOpen}
           onClose={()=>setIsModalOpen(false)}
           onSuccess={()=>{
              setIsModalOpen(false);
              fetchAttendanceData();
           } 
           }
           employeeToEdit={null}
        />

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Attendance Rate Bar Chart */}
          <div className="lg:col-span-2 bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-base font-semibold text-slate-800">
                Attendance Rate
              </h2>
              <button
                onClick={onDownloadReport}
                className="inline-flex items-center gap-2 text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Download Report
              </button>
            </div>

            <div className="h-64 w-full">
              {!isLoading && monthlyAttendanceData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={monthlyAttendanceData}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                    barSize={16}
                  >
                    <CartesianGrid vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 12 }}
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80, 100]}
                      tickFormatter={(val) => `${val}%`}
                    />
                    <Tooltip
                      formatter={(value: number) => [`${value}%`]}
                      contentStyle={{
                        backgroundColor: '#1e293b',
                        borderRadius: '8px',
                        color: '#fff',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="oneTime" stackId="a" fill="#3b82f6" />
                    <Bar dataKey="late" stackId="a" fill="#f97316" />
                    <Bar dataKey="absent" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                  {isLoading ? 'Calculating metrics...' : 'No attendance data available'}
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-6 mt-4 text-xs text-slate-600 font-medium">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
                One Time
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                Late
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-400"></span>
                Absent
              </div>
            </div>
          </div>

          {/* Employee Donut Chart */}
          <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-800">
                Employee Overview
              </h2>
              <button className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <MoreHorizontal className="w-5 h-5" />
              </button>
            </div>

            <div className="relative h-60 w-full flex items-center justify-center">
              {!isLoading && totalEmployees > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={employeeTypeData}
                        cx="50%"
                        cy="50%"
                        innerRadius={65}
                        outerRadius={95}
                        paddingAngle={3}
                        dataKey="value"
                        startAngle={90}
                        endAngle={-270}
                      >
                        {employeeTypeData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color || '#3b82f6'} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>

                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="text-2xl font-bold text-slate-900">
                      {totalEmployees}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Employee{totalEmployees === 1 ? '' : 's'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-slate-400 text-sm">
                  {isLoading ? 'Loading staff data...' : 'No staff available'}
                </div>
              )}
            </div>

            {employeeTypeData.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-6 mt-2 text-xs font-semibold">
                {employeeTypeData.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-slate-600">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="text-slate-900">{item.value}</span> {item.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Employee Attendance Matrix Table */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-xs p-5 space-y-4">
          {/* Header Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h2 className="text-lg font-bold text-slate-900">
              Employee Attendance
            </h2>

            <div className="flex flex-wrap items-center gap-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search employee..."
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 w-48"
                />
              </div>

              {/* Month Dropdown */}
              <select
                value={selectedMonth}
                onChange={(e) => {
                  setSelectedMonth(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg cursor-pointer focus:outline-none"
              >
                <option value="01">January</option>
                <option value="02">February</option>
                <option value="03">March</option>
                <option value="04">April</option>
                <option value="05">May</option>
                <option value="06">June</option>
                <option value="07">July</option>
                <option value="08">August</option>
                <option value="09">September</option>
                <option value="10">October</option>
                <option value="11">November</option>
                <option value="12">December</option>
              </select>

              {/* Year Dropdown */}
              <select
                value={selectedYear}
                onChange={(e) => {
                  setSelectedYear(e.target.value);
                  setCurrentPage(1);
                }}
                className="text-xs font-medium text-slate-600 border border-slate-200 bg-white hover:bg-slate-50 px-3 py-1.5 rounded-lg cursor-pointer focus:outline-none"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>

              {/* Download Report */}
              <button
                onClick={onDownloadReport}
                className="text-xs font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
              >
                Download Report
              </button>
            </div>
          </div>

          {/* Error View */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-100 rounded-xl flex items-center gap-3 text-red-600 text-xs font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
              <button
                onClick={fetchAttendanceData}
                className="ml-auto underline hover:text-red-800"
              >
                Retry
              </button>
            </div>
          )}

          {/* Table Container */}
          <div className="overflow-x-auto border border-slate-100 rounded-xl relative min-h-[250px]">
            {isLoading && (
              <div className="absolute inset-0 bg-white/70 z-20 flex flex-col items-center justify-center gap-2 backdrop-blur-xs">
                <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
                <span className="text-xs font-medium text-slate-500">Fetching matrix...</span>
              </div>
            )}

            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-slate-600 font-semibold">
                  <th className="py-3 px-4 min-w-[200px] sticky left-0 bg-slate-50 border-r border-slate-100 z-10">
                    <div className="flex items-center gap-1.5">
                      Employee Name
                      <ArrowUpDown className="w-3 h-3 text-slate-400 cursor-pointer" />
                    </div>
                  </th>
                  {daysInMonth.map((day) => (
                    <th key={day} className="py-3 px-2 text-center min-w-[36px]">
                      {day}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {!isLoading && currentEmployees.length > 0 ? (
                  currentEmployees.map((emp) => {
                    const displayName =
                      emp.display_name ||
                      `${emp.first_name || ''} ${emp.last_name || ''}`.trim() ||
                      'Unnamed Employee';

                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-slate-50/60 transition-colors"
                      >
                        {/* Employee Name Column */}
                        <td className="py-2.5 px-4 sticky left-0 bg-white border-r border-slate-100 z-10">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                emp.profile_photo_url ||
                                `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(
                                  emp.first_name || emp.id
                                )}`
                              }
                              alt={displayName}
                              className="w-8 h-8 rounded-full object-cover shrink-0 bg-slate-100 border border-slate-200 shadow-2xs"
                            />
                            <div className="flex flex-col">
                              <span className="font-semibold text-slate-800 whitespace-nowrap">
                                {displayName}
                              </span>
                              {emp.employee_code && (
                                <span className="text-[10px] text-slate-400">
                                  {emp.employee_code}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Daily Matrix Icons */}
                        {daysInMonth.map((day) => (
                          <td
                            key={day}
                            className="py-2.5 px-1 text-center align-middle"
                          >
                            <div className="flex items-center justify-center">
                              {renderStatusIcon(
                                emp.daily_attendance && emp.daily_attendance[day] !== undefined
                                  ? emp.daily_attendance[day]
                                  : null
                              )}
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })
                ) : (
                  !isLoading && (
                    <tr>
                      <td
                        colSpan={daysInMonth.length + 1}
                        className="text-center py-12 text-slate-400 font-medium"
                      >
                        No employee attendance records found for this period.
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 text-xs text-slate-500">
            <span>
              Showing {totalEntries > 0 ? startIdx + 1 : 0} to{' '}
              {Math.min(startIdx + itemsPerPage, totalEntries)} of {totalEntries}{' '}
              entries
            </span>

            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                    currentPage === page
                      ? 'bg-blue-600 text-white shadow-2xs'
                      : 'text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {page}
                </button>
              ))}

              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 cursor-pointer"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}