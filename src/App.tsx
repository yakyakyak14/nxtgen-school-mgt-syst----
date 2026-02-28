import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";

// Pages
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

// Placeholder pages
import Students from "./pages/Students";
import Staff from "./pages/Staff";
import Classes from "./pages/Classes";
import Attendance from "./pages/Attendance";
import Timetable from "./pages/Timetable";
import Gradebook from "./pages/Gradebook";
import ReportCards from "./pages/ReportCards";
import Fees from "./pages/Fees";
import Notices from "./pages/Notices";
import Messages from "./pages/Messages";
import Clubs from "./pages/Clubs";
import Library from "./pages/Library";
import Inventory from "./pages/Inventory";
import ParentsPortal from "./pages/ParentsPortal";
import PaymentHistory from "./pages/PaymentHistory";
import FeeDefaulters from "./pages/FeeDefaulters";
import FeeObligations from "./pages/FeeObligations";
import StudentPromotion from "./pages/StudentPromotion";
import AcademicCalendar from "./pages/AcademicCalendar";
import StudentTranscripts from "./pages/StudentTranscripts";
import Payroll from "./pages/Payroll";
import Settings from "./pages/Settings";
import Search from "./pages/Search";
import AlumniPortal from "./pages/AlumniPortal";
import WeeklyReports from "./pages/WeeklyReports";
import ExamSchedule from "./pages/ExamSchedule";
import SuperAdmin from "./pages/SuperAdmin";
import AcceptInvite from "./pages/AcceptInvite";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/accept-invite" element={<AcceptInvite />} />

            {/* Protected routes with dashboard layout */}
            <Route
              element={
                <ProtectedRoute>
                  <DashboardLayout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/students/*" element={<Students />} />
              <Route path="/staff/*" element={<Staff />} />
              <Route path="/classes/*" element={<Classes />} />
              <Route path="/attendance/*" element={<Attendance />} />
              <Route path="/timetable/*" element={<Timetable />} />
              <Route path="/gradebook/*" element={<Gradebook />} />
              <Route path="/report-cards/*" element={<ReportCards />} />
              <Route path="/fees/*" element={<Fees />} />
              <Route path="/notices/*" element={<Notices />} />
              <Route path="/messages/*" element={<Messages />} />
              <Route path="/clubs/*" element={<Clubs />} />
              <Route path="/library/*" element={<Library />} />
              <Route path="/inventory/*" element={<Inventory />} />
              <Route path="/parents/*" element={<ParentsPortal />} />
              <Route path="/payment-history/*" element={<PaymentHistory />} />
              <Route path="/fee-defaulters/*" element={<FeeDefaulters />} />
              <Route path="/fee-obligations/*" element={<FeeObligations />} />
              <Route path="/student-promotion/*" element={<StudentPromotion />} />
              <Route path="/academic-calendar/*" element={<AcademicCalendar />} />
              <Route path="/student-transcripts/*" element={<StudentTranscripts />} />
              <Route path="/payroll/*" element={<Payroll />} />
              <Route path="/settings/*" element={<Settings />} />
              <Route path="/search" element={<Search />} />
              <Route path="/alumni/*" element={<AlumniPortal />} />
              <Route path="/weekly-reports/*" element={<WeeklyReports />} />
              <Route path="/exam-schedule/*" element={<ExamSchedule />} />
              <Route path="/super-admin/*" element={<SuperAdmin />} />
            </Route>

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
