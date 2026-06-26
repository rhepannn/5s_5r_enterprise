export type UserRole = 'SUPERADMIN' | 'ADMIN_5S' | 'AUDITOR' | 'KEPALA_DIVISI' | 'PIC' | 'ANGGOTA';
export type PilarType = 'RINGKAS' | 'RAPI' | 'RESIK' | 'RAWAT' | 'RAJIN';
export type DivisionCategory = 'PRODUKSI' | 'KANTOR' | 'GUDANG';
export type AreaCategory = 'PRODUKSI' | 'KANTOR' | 'GUDANG' | 'LABORATORIUM' | 'OUTDOOR';
export type AuditType = 'MANDIRI' | 'INTERNAL' | 'CROSS' | 'SURPRISE';
export type AuditStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'PENDING_REVIEW' | 'COMPLETED' | 'APPROVED' | 'REJECTED';
export type PeriodType = 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ANNUAL';
export type ImprovementStatus = 'OPEN' | 'IN_PROGRESS' | 'VERIFICATION_NEEDED' | 'CLOSED' | 'REJECTED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string;
  divisionId: string | null;
  avatar: string | null;
  company?: { name: string; code: string };
}

export interface Company {
  id: string;
  name: string;
  code: string;
  logo?: string;
  address?: string;
  phone?: string;
  email?: string;
  createdAt: string;
  _count?: { plants: number; users: number };
}

export interface Plant {
  id: string;
  name: string;
  code: string;
  address?: string;
  companyId: string;
  _count?: { departments: number };
}

export interface Department {
  id: string;
  name: string;
  code: string;
  plantId: string;
  _count?: { divisions: number };
}

export interface Division {
  id: string;
  name: string;
  code: string;
  category: DivisionCategory;
  departmentId: string;
  department?: { name: string; plant: { name: string } };
  _count?: { areas: number; users: number };
}

export interface WorkArea {
  id: string;
  name: string;
  code: string;
  category: AreaCategory;
  divisionId: string;
  latitude?: number;
  longitude?: number;
  isActive: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  lastLoginAt?: string;
  companyId: string;
  divisionId?: string;
  company: { name: string; code: string };
  division?: { id: string; name: string; category: DivisionCategory };
  createdAt: string;
}

export interface AuditPeriod {
  id: string;
  name: string;
  type: PeriodType;
  startDate: string;
  endDate: string;
  isActive: boolean;
  companyId: string;
  _count?: { sessions: number };
}

export interface ChecklistTemplate {
  id: string;
  name: string;
  areaCategory: AreaCategory;
  pilar: PilarType;
  question: string;
  guidance?: string;
  isProperTag: boolean;
  isoClause?: string;
  sortOrder: number;
  isActive: boolean;
}

export interface AuditChecklistItem {
  id: string;
  pilar: PilarType;
  question: string;
  score: number | null;
  notes: string | null;
  photos: string[];
  isProperTag: boolean;
  isoClause: string | null;
  templateId: string | null;
}

export interface AuditSession {
  id: string;
  type: AuditType;
  status: AuditStatus;
  scheduledAt: string;
  startedAt: string | null;
  completedAt: string | null;
  reviewedAt: string | null;
  approvedAt: string | null;
  rejectedAt: string | null;
  rejectionReason: string | null;
  surpriseMultiplier: number;
  totalScore: number | null;
  notes: string | null;
  area?: { id: string; name: string; code: string; category: AreaCategory };
  division?: { id: string; name: string; category: DivisionCategory };
  auditor?: { id: string; name: string; email?: string };
  period?: { id: string; name: string };
  checklistItems?: AuditChecklistItem[];
  _count?: { checklistItems: number };
}

export interface AuditTrailEntry {
  id: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  notes: string | null;
  userName: string;
  userRole: UserRole;
  createdAt: string;
}

export type ProblemCategory = 'KEBERSIHAN' | 'PENATAAN' | 'PELABELAN' | 'KESELAMATAN' | 'EFISIENSI';

export interface Improvement {
  id: string;
  code: string;
  status: ImprovementStatus;
  problemCategory: ProblemCategory;
  pilarTags: PilarType[];
  description: string;
  rootCause: string;
  actions: string;
  photoBefore: string[];
  photoAfter: string[];
  picId: string;
  divisionId: string;
  targetDate: string;
  actualDate: string | null;
  estimatedCost: number | null;
  bonusPoints: number;
  isProperEvidence: boolean;
  isBestPractice: boolean;
  isoClause: string | null;
  isoClauses: string[];
  latitude: number | null;
  longitude: number | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  qccProjectId: string | null;
  division?: { id: string; name: string; category: DivisionCategory };
  pic?: { id: string; name: string; email?: string };
  qccProject?: { id: string; title: string; status: string } | null;
  createdAt: string;
}

export interface ImprovementReport {
  total: number;
  byStatus: Record<string, number>;
  closedCount: number;
  onTimePercentage: number;
  totalBonus: number;
  perDivision: { name: string; total: number; closed: number; onTime: number; bonus: number }[];
  trend: { month: string; total: number; closed: number }[];
}

export interface DivisionScoreEntry {
  id: string;
  divisionId: string;
  periodId: string;
  auditScore: number;
  beforeAfterScore: number;
  innovationBonus: number;
  consistencyScore: number;
  surpriseScore: number;
  environmentScore: number;
  baseScore: number;
  bonusPoints: number;
  totalScore: number;
  projectedScore: number;
  rank: number | null;
  rankCategory: DivisionCategory;
  delta?: number | null;
  division?: { id: string; name: string; code: string; category: DivisionCategory };
}

export interface PeriodCountdown {
  periodName: string;
  startDate: string;
  endDate: string;
  daysRemaining: number;
  isEnded: boolean;
  progressPercent: number;
}

export type OKRStatus = 'ON_TRACK' | 'AT_RISK' | 'BEHIND' | 'COMPLETED';

export interface OkrKeyResult {
  id: string;
  title: string;
  target: number;
  actual: number;
  unit: string;
  status: OKRStatus;
}

export interface Okr {
  id: string;
  level: 'COMPANY' | 'DIVISION';
  divisionId: string | null;
  objective: string;
  quarter: string;
  keyResults: OkrKeyResult[];
  division?: { name: string } | null;
}

export interface KpiTarget {
  id: string;
  divisionId: string | null;
  pilar: PilarType;
  indicator: string;
  target: number;
  actual: number | null;
  unit: string;
  period: string;
  division?: { name: string } | null;
}

export type ScheduleFrequency = 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';

export interface AuditSchedule {
  id: string;
  name: string;
  type: AuditType;
  frequency: ScheduleFrequency;
  dayOfMonth: number | null;
  dayOfWeek: number | null;
  hour: number;
  areaId: string;
  divisionId: string;
  auditorId: string;
  periodId: string | null;
  isActive: boolean;
  lastRunAt: string | null;
  nextRunAt: string | null;
  area?: { name: string; code: string };
  division?: { name: string };
  auditor?: { name: string };
}

export interface DashboardSummary {
  period: { id: string; name: string } | null;
  companyAvg: number;
  companyBand: 'green' | 'yellow' | 'red' | 'none';
  delta: number | null;
  kpiAchievement: number;
  okrProgress: number;
  overdueAudits: number;
  lateImprovements: number;
  trend: { period: string; avgScore: number }[];
}

export interface HeatmapArea {
  id: string;
  name: string;
  code: string;
  division: string;
  category: string;
  score: number | null;
  band: 'green' | 'yellow' | 'red' | 'none';
  auditCount: number;
}

export interface GapArea {
  id: string;
  name: string;
  division: string;
  avgScore: number | null;
  lowCount: number;
  totalAudits: number;
}

export interface IndividualStat {
  id: string;
  name: string;
  role: UserRole;
  auditsConducted: number;
  improvementsSubmitted: number;
  badges: number;
}

export type QCCStatus = 'PLAN' | 'DO' | 'CHECK' | 'ACT' | 'COMPLETED';

export interface QccProject {
  id: string;
  title: string;
  divisionId: string;
  status: QCCStatus;
  members: string[];
  startDate: string;
  targetDate: string;
  completedAt: string | null;
  problemDesc: string;
  rootCause: string | null;
  solution: string | null;
  savingCost: number | null;
  bonusPoints: number;
  toolsData?: Record<string, unknown> | null;
  division?: { id: string; name: string; category: DivisionCategory };
  improvements?: { id: string; code: string; status: string }[];
  _count?: { improvements: number };
}

export interface QccStats {
  total: number;
  active: number;
  completed: number;
  totalSaving: number;
  totalBonus: number;
  byStatus: Record<string, number>;
}

export type KaizenStatus = 'OPEN' | 'ADOPTED' | 'REJECTED';

export interface KaizenIdea {
  id: string;
  title: string;
  description: string;
  divisionId: string;
  status: KaizenStatus;
  voteCount: number;
  estimatedSaving: number | null;
  qccProjectId: string | null;
  hasVoted: boolean;
  division?: { name: string };
  submittedBy?: { name: string };
  createdAt: string;
}

export type IsoStandard = 'ISO_9001' | 'ISO_14001' | 'ISO_45001';

export interface IsoClause {
  id: string;
  standard: IsoStandard;
  code: string;
  title: string;
  description: string | null;
}

export interface ComplianceClause {
  id: string;
  code: string;
  title: string;
  description: string | null;
  improvements: number;
  closedImprovements: number;
  auditItems: number;
  evidenceCount: number;
  covered: boolean;
}

export interface ComplianceStatus {
  standard: IsoStandard;
  total: number;
  covered: number;
  coverage: number;
  clauses: ComplianceClause[];
}

export interface IsoReadiness {
  companyAvg: number;
  avgCoverage: number;
  readinessScore: number;
  level: string;
  coverages: { standard: IsoStandard; coverage: number; covered: number; total: number }[];
  trend: { period: string; avgScore: number }[];
}

export interface PotentialNC {
  count: number;
  lowScoreItems: { id: string; clause: string; score: number; question: string; area: string; division: string }[];
  problematicImprovements: { id: string; code: string; clauses: string[]; status: string; description: string; division: string }[];
}

export interface EvidencePackage {
  standard: IsoStandard;
  generatedAt: string;
  clauses: {
    clause: string; title: string;
    improvements: { code: string; description: string; status: string; photoBefore: string[]; photoAfter: string[]; division: { name: string } }[];
    auditItems: { question: string; score: number | null; photos: string[]; session: { area: { name: string } } }[];
  }[];
}

export type ProperRank = 'EMAS' | 'HIJAU' | 'BIRU' | 'MERAH' | 'HITAM';
export type CritStatus = 'COMPLIANT' | 'PARTIAL' | 'NON_COMPLIANT' | 'NA';
export type BalanceType = 'LIMBAH_B3' | 'LIMBAH_NON_B3' | 'AIR' | 'ENERGI';

export interface ProperCriterion {
  code: string;
  category: 'KETAATAN' | 'BEYOND';
  name: string;
  status: CritStatus;
  light: 'green' | 'yellow' | 'red' | 'gray';
}

export interface ProperDashboard {
  period: string;
  currentRank: ProperRank;
  targetRank: ProperRank;
  projectedRank: ProperRank;
  criteria: ProperCriterion[];
  compliantCount: number;
  totalCriteria: number;
}

export interface EnvBalance {
  id: string;
  period: string;
  type: BalanceType;
  data: Record<string, unknown>;
}

export interface EnvPermit {
  id: string;
  type: string;
  name: string;
  number: string;
  issueDate: string;
  expiryDate: string;
  status: 'ACTIVE' | 'EXPIRING_SOON' | 'EXPIRED';
  fileUrl: string | null;
  notes: string | null;
}

export interface ProperEvidence {
  total: number;
  improvements: { id: string; code: string; description: string; status: string; photoAfter: string[]; division: { name: string } }[];
  permitDocs: { id: string; name: string; number: string; fileUrl: string | null }[];
}

export interface BadgeDef {
  code: string; name: string; desc: string; icon: string;
  earned?: boolean; earnedAt?: string | null;
}
export interface UserBadgeEntry {
  id: string; userName: string; role: UserRole; earnedAt: string;
  badge: { code: string; name: string; icon: string; desc: string };
}
export interface WallOfFame {
  bestPhotos: { id: string; code: string; description: string; photoBefore: string[]; photoAfter: string[]; division: { name: string } }[];
  champions: { division: string; category: string; score: number }[];
  period?: string;
}
export interface BestPractice {
  id: string; code: string; description: string; rootCause: string; actions: string;
  problemCategory: string; pilarTags: string[]; photoBefore: string[]; photoAfter: string[]; division: { name: string };
}
export interface AnnualAward {
  year: string; period: string | null;
  winners: { category: string; rank: number; division: string; score: number }[];
}
export interface Suggestion { title: string; detail: string; priority: 'tinggi' | 'sedang' | 'rendah' }

export interface FloorPin { x: number; y: number; label: string; type?: string; improvementId?: string }
export interface FloorPlan { id: string; name: string; imageUrl: string; pins: FloorPin[] }

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}
