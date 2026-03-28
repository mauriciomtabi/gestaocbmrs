
import React from 'react';
import { Provider, AttendanceRecord, FuelSupply, Vehicle, StationNickname } from '../types';
import { formatMinutesToHHMM, getLatestVisit, getDaysInactivity } from '../utils/timeUtils';
import { normalizeFuelType, getStationDisplayName } from '../utils/fuelUtils';
import { Users, Clock, AlertCircle, CheckCircle, Calendar, ArrowUpRight, ShieldAlert, Fuel, DollarSign, Droplets, TrendingUp, LayoutDashboard, Car, MapPin, FilterX } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LineChart, Line, LabelList } from 'recharts';

interface Props {
  providers: Provider[];
  attendance: AttendanceRecord[];
  fuelSupplies: FuelSupply[];
  vehicles: Vehicle[];
  stationNicknames: StationNickname[];
  onNavigateProvider: (p: Provider) => void;
  onNavigateFuel: () => void;
}

const Dashboard: React.FC<Props> = ({ providers, attendance, fuelSupplies, vehicles, stationNicknames, onNavigateProvider, onNavigateFuel }) => {
  const [filterFuelType, setFilterFuelType] = React.useState<string | null>(null);
  const [filterStation, setFilterStation] = React.useState<string | null>(null);
  const [filterVehicle, setFilterVehicle] = React.useState<string | null>(null);
  const [filterMonths, setFilterMonths] = React.useState<string[]>([]);

  const nicknameMap = React.useMemo(() => {
    return stationNicknames.reduce((acc, curr) => {
      acc[curr.originalName] = curr.nickname;
      return acc;
    }, {} as Record<string, string>);
  }, [stationNicknames]);

  const suppliesExcludingMonth = React.useMemo(() => {
    return fuelSupplies.filter(s => {
      if (filterFuelType && normalizeFuelType(s.fuelType) !== filterFuelType) return false;
      if (filterStation && getStationDisplayName(s.location, nicknameMap) !== filterStation) return false;
      if (filterVehicle && s.plate !== filterVehicle) return false;
      return true;
    });
  }, [fuelSupplies, filterFuelType, filterStation, filterVehicle, nicknameMap]);

  const filteredFuelSupplies = React.useMemo(() => {
    return suppliesExcludingMonth.filter(s => {
      if (filterMonths.length > 0) {
        const date = new Date(s.date);
        const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!filterMonths.includes(monthYear)) return false;
      }
      return true;
    });
  }, [suppliesExcludingMonth, filterMonths]);

  const totalWorkedMinutes = attendance.reduce((acc, curr) => acc + curr.durationMinutes, 0);
  const activeProviders = providers.filter(p => p.status === 'active');
  const completedCount = providers.filter(p => p.status === 'completed').length;
  
  // Fuel Stats (based on filtered data)
  const totalFuelCost = filteredFuelSupplies.reduce((acc, curr) => acc + curr.totalValue, 0);
  const totalLiters = filteredFuelSupplies.reduce((acc, curr) => acc + curr.liters, 0);
  const avgPricePerLiter = totalLiters > 0 ? totalFuelCost / totalLiters : 0;
  
  const inactivityAlerts = activeProviders.map(p => {
    const pAttendance = attendance.filter(a => a.providerId === p.id);
    const lastDate = getLatestVisit(pAttendance);
    const days = getDaysInactivity(lastDate);
    return { provider: p, days, lastDate };
  }).filter(item => item.days >= 10);

  const closeToFinishAlerts = activeProviders.map(p => {
    const pAttendance = attendance.filter(a => a.providerId === p.id);
    const totalMinutes = pAttendance.reduce((acc, curr) => acc + curr.durationMinutes, 0);
    const targetMinutes = (p.totalHoursToFulfill || 0) * 60;
    const progress = targetMinutes > 0 ? (totalMinutes / targetMinutes) * 100 : 0;
    return { provider: p, progress };
  }).filter(item => item.progress >= 90 && item.progress < 100);

  // Charts Data
  const fuelByType = filteredFuelSupplies.reduce((acc: Record<string, { name: string, total: number, liters: number }>, curr) => {
    const normalized = normalizeFuelType(curr.fuelType);
    if (!acc[normalized]) acc[normalized] = { name: normalized, total: 0, liters: 0 };
    acc[normalized].total += curr.totalValue;
    acc[normalized].liters += curr.liters;
    return acc;
  }, {});

  const fuelByTypeData = Object.values(fuelByType).map((f: any) => ({
    name: f.name,
    avgPrice: f.liters > 0 ? f.total / f.liters : 0,
    total: f.total,
    liters: f.liters
  }));

  const valueByLocation = filteredFuelSupplies.reduce((acc: Record<string, number>, curr) => {
    const loc = curr.location || 'Outros';
    const displayName = getStationDisplayName(loc, nicknameMap);
    acc[displayName] = (acc[displayName] || 0) + curr.totalValue;
    return acc;
  }, {} as Record<string, number>);

  const valueByLocationData = Object.entries(valueByLocation)
    .map(([displayName, total]) => {
      let shortName = displayName.toUpperCase()
        .replace(/^POSTO\s+/g, '')
        .replace(/^AUTO\s+POSTO\s+/g, '')
        .replace(/^SIM\s+/g, '')
        .replace(/LTDA.*$/g, '')
        .trim();
      if (shortName.length > 15) shortName = shortName.substring(0, 12) + '...';
      
      return { name: shortName, displayName, fullName: displayName, value: total };
    })
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 5);

  const costByVehicle = filteredFuelSupplies.reduce((acc: Record<string, number>, curr) => {
    acc[curr.plate] = (acc[curr.plate] || 0) + curr.totalValue;
    return acc;
  }, {});

  const costByVehicleData = Object.entries(costByVehicle)
    .map(([plate, value]) => {
      const vehicle = vehicles.find(v => v.plate === plate);
      
      // Calculate KM/L for this vehicle
      const vehicleSupplies = fuelSupplies
        .filter(s => s.plate === plate)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      let kmL = 0;
      if (vehicleSupplies.length >= 2) {
        const last = vehicleSupplies[0];
        const prev = vehicleSupplies[1];
        const kmDiff = last.km - prev.km;
        if (kmDiff > 0 && last.liters > 0) {
          kmL = kmDiff / last.liters;
        }
      }

      return { 
        name: plate, 
        value: value as number,
        photo: vehicle?.photo,
        fleetCode: vehicle?.fleetCode,
        kmL
      };
    })
    .sort((a, b) => (b.value as number) - (a.value as number))
    .slice(0, 5);

  const bestVehicle = [...costByVehicleData]
    .filter(v => v.kmL > 0)
    .sort((a, b) => b.kmL - a.kmL)[0];

  // Monthly Spending Data
  const monthlySpending = suppliesExcludingMonth.reduce((acc: Record<string, number>, curr) => {
    const date = new Date(curr.date);
    const monthYear = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    acc[monthYear] = (acc[monthYear] || 0) + curr.totalValue;
    return acc;
  }, {});

  const monthlySpendingData = Object.entries(monthlySpending)
    .map(([month, value]) => {
      const [year, m] = month.split('-');
      const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return { 
        month, 
        label: `${monthNames[parseInt(m) - 1]}/${year.slice(2)}`, 
        value: value as number 
      };
    })
    .sort((a, b) => a.month.localeCompare(b.month));

  const CHART_COLORS = ['#2563eb', '#4f46e5', '#7c3aed', '#db2777', '#dc2626'];

  const clearFilters = () => {
    setFilterFuelType(null);
    setFilterStation(null);
    setFilterVehicle(null);
    setFilterMonths([]);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-3">
            <LayoutDashboard className="text-blue-600" size={32} />
            Painel de Controle
          </h2>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mt-1 opacity-70">Monitoramento Integrado de Operações</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-slate-200 shadow-sm text-[10px] font-black uppercase text-slate-500">
          <Calendar size={14} className="text-blue-600" />
          {new Date().toLocaleDateString('pt-BR')} • {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </header>

      {/* SEÇÃO: PRESTADORES DE SERVIÇO */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-b border-slate-200 pb-4">
          <div className="bg-blue-600 p-2 rounded-xl text-white shadow-lg shadow-blue-200">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Prestadores de Serviço</h3>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Controle de jornada e conformidade</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Stats */}
          <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Ativos" value={activeProviders.length.toString()} color="blue" />
            <StatCard icon={Clock} label="Horas" value={formatMinutesToHHMM(totalWorkedMinutes)} color="emerald" />
            <StatCard icon={CheckCircle} label="Concluídos" value={completedCount.toString()} color="indigo" />
            <StatCard icon={ShieldAlert} label="Alertas" value={inactivityAlerts.length.toString()} color="amber" />
          </div>

          {/* Alerts */}
          <div className="lg:col-span-5">
            <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden h-full">
              <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <AlertCircle size={14} className="text-red-500" />
                  Alertas de Conformidade
                </h4>
                {inactivityAlerts.length + closeToFinishAlerts.length > 0 && (
                  <span className="bg-red-100 text-red-600 text-[8px] font-black px-2 py-0.5 rounded-full border border-red-200">
                    {inactivityAlerts.length + closeToFinishAlerts.length} PENDÊNCIAS
                  </span>
                )}
              </div>
              <div className="p-4 space-y-3 max-h-[200px] overflow-y-auto no-scrollbar">
                {inactivityAlerts.length === 0 && closeToFinishAlerts.length === 0 ? (
                  <div className="py-8 text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tudo em ordem</p>
                  </div>
                ) : (
                  <>
                    {inactivityAlerts.map(item => (
                      <div key={item.provider.id} className="flex gap-3 p-3 bg-red-50/50 rounded-2xl border border-red-100/50">
                        <div className="bg-red-600 p-1.5 rounded-lg text-white shrink-0 h-fit">
                          <AlertCircle size={12} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-red-900 uppercase truncate">{item.provider.name}</p>
                          <p className="text-[9px] text-red-600 font-bold">Inativo há {item.days} dias</p>
                        </div>
                      </div>
                    ))}
                    {closeToFinishAlerts.map(item => (
                      <div key={item.provider.id} className="flex gap-3 p-3 bg-blue-50/50 rounded-2xl border border-blue-100/50">
                        <div className="bg-blue-600 p-1.5 rounded-lg text-white shrink-0 h-fit">
                          <CheckCircle size={12} />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-black text-blue-900 uppercase truncate">{item.provider.name}</p>
                          <p className="text-[9px] text-blue-600 font-bold">Atingiu {Math.round(item.progress)}% das horas</p>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: ABASTECIMENTOS */}
      <section className="space-y-6">
        <div className="flex items-center justify-between border-b border-slate-200 pb-4">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 p-2 rounded-xl text-white shadow-lg shadow-emerald-200">
              <Fuel size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Gestão de Abastecimento</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Consumo, custos e eficiência da frota</p>
            </div>
          </div>
          {(filterFuelType || filterStation || filterVehicle || filterMonths.length > 0) && (
            <button 
              onClick={clearFilters}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase transition-all"
            >
              <FilterX size={14} />
              Limpar Filtros
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Monthly Spending Chart */}
          <div className="lg:col-span-12 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <TrendingUp size={14} className="text-blue-600" />
              Gasto Mensal (Histórico)
            </h4>
            <div className="flex flex-wrap gap-2 mb-6">
              {monthlySpendingData.map(item => (
                <button
                  key={item.month}
                  onClick={() => setFilterMonths(prev => 
                    prev.includes(item.month) 
                      ? prev.filter(m => m !== item.month) 
                      : [...prev, item.month]
                  )}
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${
                    filterMonths.includes(item.month)
                      ? 'bg-blue-600 border-blue-500 text-white shadow-md'
                      : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
            <div className="h-64 w-full">
              {monthlySpendingData.length === 0 ? (
                <p className="text-[10px] text-slate-400 italic text-center py-12">Sem dados históricos</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart 
                    data={monthlySpendingData}
                    onClick={(data) => {
                      if (data && data.activePayload) {
                        const month = data.activePayload[0].payload.month;
                        setFilterMonths(prev => 
                          prev.includes(month) 
                            ? prev.filter(m => m !== month) 
                            : [...prev, month]
                        );
                      }
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 800, fill: '#94a3b8' }} tickFormatter={(val) => `R$ ${val}`} />
                    <Tooltip 
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 800 }}
                      formatter={(val: number) => [`R$ ${val.toLocaleString('pt-BR')}`, 'Gasto']}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#2563eb" 
                      strokeWidth={4} 
                      dot={(props: any) => {
                        const { cx, cy, payload } = props;
                        const isActive = filterMonths.includes(payload.month);
                        return (
                          <circle 
                            key={`dot-${payload.month}`}
                            cx={cx} 
                            cy={cy} 
                            r={isActive ? 8 : 6} 
                            fill={isActive ? '#1e40af' : '#2563eb'} 
                            strokeWidth={isActive ? 4 : 2} 
                            stroke="#fff" 
                            className="cursor-pointer"
                          />
                        );
                      }} 
                      activeDot={{ r: 8 }} 
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="lg:col-span-12 grid grid-cols-1 sm:grid-cols-4 gap-4">
            <StatCard icon={DollarSign} label="Total Gasto" value={`R$ ${totalFuelCost.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`} color="slate" />
            <StatCard icon={Droplets} label="Total Litros" value={`${Math.round(totalLiters)}L`} color="slate" />
            <StatCard icon={TrendingUp} label="Preço Médio" value={`R$ ${avgPricePerLiter.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="slate" />
            {bestVehicle && (
              <div className="bg-emerald-600 p-4 rounded-3xl shadow-lg shadow-emerald-200 flex flex-col justify-between group hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300">
                <div className="flex justify-between items-start mb-3">
                  <div className="p-2 rounded-xl bg-white/20 text-white border border-white/30">
                    <TrendingUp size={16} />
                  </div>
                  <span className="text-[8px] font-black bg-white/20 text-white px-2 py-0.5 rounded-full border border-white/30 uppercase tracking-widest">Melhor Média</span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-8 bg-white/20 rounded-lg overflow-hidden border border-white/30 flex items-center justify-center shrink-0">
                    {bestVehicle.photo ? (
                      <img src={bestVehicle.photo} alt={bestVehicle.name} className="w-full h-full object-contain p-0.5" />
                    ) : (
                      <Car size={14} className="text-white/50" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <p className="text-[8px] font-black text-white/70 uppercase tracking-[0.15em] mb-0.5">Veículo Eficiente</p>
                    <p className="text-sm font-black text-white tracking-tight truncate">{bestVehicle.name}</p>
                    <p className="text-[10px] font-black text-white leading-none mt-1">{bestVehicle.kmL.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} KM/L</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Indicators Grid */}
          <div className="lg:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Prices by Fuel Type */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Fuel size={14} className="text-blue-600" />
                Média por Combustível
              </h4>
              <div className="space-y-3">
                {fuelByTypeData.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-8">Sem dados</p>
                ) : (
                  fuelByTypeData.map((item, idx) => (
                    <button 
                      key={item.name} 
                      onClick={() => setFilterFuelType(filterFuelType === item.name ? null : item.name)}
                      className={`w-full flex items-center justify-between p-3 rounded-2xl border transition-all ${filterFuelType === item.name ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 text-slate-600 hover:border-blue-200'}`}
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className={`text-[10px] font-black uppercase leading-tight ${filterFuelType === item.name ? 'text-white' : 'text-slate-600'}`}>{item.name}</span>
                        <span className={`text-[8px] font-bold uppercase tracking-tight ${filterFuelType === item.name ? 'text-white/70' : 'text-slate-400'}`}>
                          {item.liters.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}L • R$ {item.total.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                        </span>
                      </div>
                      <span className={`text-sm font-black ${filterFuelType === item.name ? 'text-white' : 'text-slate-900'}`}>R$ {item.avgPrice.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Value by Location */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <MapPin size={14} className="text-blue-600" />
                Gasto por Posto (Top 5)
              </h4>
              <div className="h-48 w-full">
                {valueByLocationData.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-8">Sem dados</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={valueByLocationData} 
                      layout="vertical" 
                      margin={{ left: -20, right: 20 }}
                      onClick={(data) => {
                        if (data && data.activePayload) {
                          const displayName = data.activePayload[0].payload.displayName;
                          setFilterStation(filterStation === displayName ? null : displayName);
                        }
                      }}
                    >
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" width={80} tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }} axisLine={false} tickLine={false} />
                      <Tooltip 
                        cursor={{ fill: 'transparent' }}
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 800 }}
                        formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR')}`, 'Total']}
                      />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={12} cursor="pointer">
                        {valueByLocationData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={filterStation === entry.displayName ? '#1e40af' : CHART_COLORS[index % CHART_COLORS.length]} 
                            opacity={filterStation && filterStation !== entry.displayName ? 0.3 : 1}
                          />
                        ))}
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          formatter={(val: number) => `R$ ${val.toLocaleString('pt-BR')}`}
                          style={{ fontSize: '9px', fontWeight: 900, fill: '#64748b' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Cost by Vehicle */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                <Car size={14} className="text-blue-600" />
                Gasto por Veículo (Top 5)
              </h4>
              <div className="space-y-3">
                {costByVehicleData.length === 0 ? (
                  <p className="text-[10px] text-slate-400 italic text-center py-8">Sem dados</p>
                ) : (
                  costByVehicleData.map((item, idx) => (
                    <button 
                      key={item.name} 
                      onClick={() => setFilterVehicle(filterVehicle === item.name ? null : item.name)}
                      className={`w-full flex items-center justify-between p-2 rounded-2xl border transition-all group ${filterVehicle === item.name ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-50 border-slate-100 hover:border-blue-200'}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-8 bg-white rounded-lg overflow-hidden border border-slate-200 flex items-center justify-center shrink-0">
                          {item.photo ? (
                            <img src={item.photo} alt={item.name} className="w-full h-full object-contain p-0.5" />
                          ) : (
                            <Car size={14} className={filterVehicle === item.name ? 'text-blue-200' : 'text-slate-300'} />
                          )}
                        </div>
                        <div className="flex flex-col text-left">
                          <span className={`text-[10px] font-black uppercase leading-none ${filterVehicle === item.name ? 'text-white' : 'text-slate-800'}`}>{item.name}</span>
                          <span className={`text-[8px] font-bold uppercase mt-0.5 ${filterVehicle === item.name ? 'text-blue-200' : 'text-slate-400'}`}>{item.fleetCode || '-'}</span>
                          {item.kmL > 0 && (
                            <span className={`text-[9px] font-black mt-1 ${filterVehicle === item.name ? 'text-white' : 'text-blue-600'}`}>{item.kmL.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} KM/L</span>
                          )}
                        </div>
                      </div>
                      <span className={`text-xs font-black ${filterVehicle === item.name ? 'text-white' : 'text-slate-900'}`}>R$ {item.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEÇÃO: ATIVIDADE RECENTE */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <Clock size={16} className="text-blue-600" />
          <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Fluxo de Atividade Recente</h3>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-2">
            <div className="grid grid-cols-1 gap-1">
              {(() => {
                const activities = [
                  ...attendance.map(a => ({ type: 'attendance' as const, data: a, date: new Date(a.date.includes('T') ? a.date : `${a.date}T12:00:00`) })),
                  ...fuelSupplies.map(f => ({ type: 'fuel' as const, data: f, date: new Date(f.date.includes('T') ? f.date : `${f.date}T12:00:00`) }))
                ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 6);

                if (activities.length === 0) {
                  return (
                    <div className="py-12 text-center">
                      <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest italic">Sem lançamentos recentes</p>
                    </div>
                  );
                }

                return activities.map(activity => {
                  if (activity.type === 'attendance') {
                    const record = activity.data as AttendanceRecord;
                    const p = providers.find(prov => prov.id === record.providerId);
                    return (
                      <div key={record.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-slate-50 transition-all rounded-2xl group gap-3">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="w-9 h-9 bg-slate-100 rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm border border-white shrink-0 group-hover:bg-blue-600 group-hover:text-white transition-all">
                            {(p?.name || '?').charAt(0)}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-slate-800 text-[11px] uppercase truncate">{p?.name || 'Desconhecido'}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(record.date.includes('T') ? record.date : `${record.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                              <span className="text-[8px] font-black text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded uppercase">
                                {record.entryTime || '--:--'} às {record.exitTime || '--:--'}
                              </span>
                              <span className="text-[8px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter hidden sm:inline-block">Prestador</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <span className="bg-emerald-50 text-emerald-600 border border-emerald-100 px-2 py-0.5 rounded-lg text-[9px] font-black">
                            +{formatMinutesToHHMM(record.durationMinutes)}
                          </span>
                          <button 
                            onClick={() => p && onNavigateProvider(p)}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 sm:text-slate-200 group-hover:text-blue-600 transition-all"
                            title="Ver Detalhes"
                          >
                            <ArrowUpRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  } else {
                    const supply = activity.data as FuelSupply;
                    const vehicle = vehicles.find(v => v.plate === supply.plate);
                    return (
                      <div key={supply.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 hover:bg-slate-50 transition-all rounded-2xl group gap-3">
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                          <div className="w-12 h-9 bg-slate-50 rounded-xl overflow-hidden border border-slate-100 shrink-0 flex items-center justify-center shadow-sm group-hover:border-blue-200 transition-all">
                            {vehicle?.photo ? (
                              <img src={vehicle.photo} alt={supply.plate} className="w-full h-full object-contain p-0.5" />
                            ) : (
                              <Car size={16} className="text-slate-300" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-slate-800 text-[11px] uppercase truncate">
                              {supply.plate.replace(/\s/g, '').length === 7 ? `${supply.plate.replace(/\s/g, '').slice(0, 3)} ${supply.plate.replace(/\s/g, '').slice(3)}` : supply.plate} 
                              <span className="ml-2 text-[9px] text-slate-400 font-bold">
                                ({vehicles.find(v => v.plate === supply.plate)?.fleetCode || '-'})
                              </span>
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{new Date(supply.date.includes('T') ? supply.date : `${supply.date}T12:00:00`).toLocaleDateString('pt-BR')}</span>
                              <span className="text-[8px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-black uppercase tracking-tighter">Abastecimento</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                          <span className="bg-blue-50 text-blue-700 border border-blue-100 px-2 py-0.5 rounded-lg text-[9px] font-black">
                            R$ {supply.totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </span>
                          <button 
                            onClick={onNavigateFuel}
                            className="p-1.5 hover:bg-blue-50 rounded-lg text-slate-400 sm:text-slate-200 group-hover:text-blue-600 transition-all"
                            title="Ver Abastecimentos"
                          >
                            <ArrowUpRight size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  }
                });
              })()}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

const StatCard = ({ icon: Icon, label, value, color, className }: { icon: any, label: string, value: string, color: string, className?: string }) => {
  const colorClasses: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600 border-blue-100 group-hover:bg-blue-600 group-hover:text-white",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100 group-hover:bg-emerald-600 group-hover:text-white",
    indigo: "bg-indigo-50 text-indigo-600 border-indigo-100 group-hover:bg-indigo-600 group-hover:text-white",
    amber: "bg-amber-50 text-amber-600 border-amber-100 group-hover:bg-amber-600 group-hover:text-white",
    slate: "bg-slate-50 text-slate-600 border-slate-100 group-hover:bg-slate-800 group-hover:text-white"
  };

  return (
    <div className={`bg-white p-4 rounded-3xl shadow-sm border border-slate-200 flex flex-col justify-between group hover:shadow-md hover:-translate-y-0.5 transition-all duration-300 ${className}`}>
      <div className="flex justify-between items-start mb-3">
        <div className={`p-2 rounded-xl border transition-all duration-300 ${colorClasses[color]}`}>
          <Icon size={16} />
        </div>
      </div>
      <div>
        <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.15em] mb-0.5">{label}</p>
        <p className="text-lg font-black text-slate-900 tracking-tight truncate">{value}</p>
      </div>
    </div>
  );
};

export default Dashboard;
