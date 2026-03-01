<template>
  <div class="syndication-calendar glass-panel p-6 mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
    <div class="flex items-center justify-between mb-8">
      <div>
        <h3 class="text-sm font-black uppercase tracking-widest text-gray-400">{{ $t('studio.analytics.contentCalendar') }}</h3>
        <p class="text-[10px] text-gray-500 font-bold uppercase tracking-wider">{{ $t('studio.analytics.distributionSchedule') }}</p>
      </div>
      
      <div class="flex items-center gap-4 bg-white/5 p-1 rounded-xl">
        <button 
          class="p-2 rounded-lg text-gray-500 hover:text-white transition-colors"
          @click="prevMonth"
        >
          <left theme="outline" size="16" />
        </button>
        <span class="text-xs font-black uppercase tracking-widest text-white min-w-[120px] text-center">
          {{ formatMonth(currentMonth) }}
        </span>
        <button 
          class="p-2 rounded-lg text-gray-500 hover:text-white transition-colors"
          @click="nextMonth"
        >
          <right theme="outline" size="16" />
        </button>
      </div>
    </div>

    <div class="grid grid-cols-7 gap-2">
      <!-- Days Header -->
      <div v-for="day in weekDayKeys" :key="day" class="text-center py-2">
        <span class="text-[9px] font-black uppercase tracking-widest text-gray-600">{{ $t(`studio.calendar.weekDays.${day}`) }}</span>
      </div>

      <!-- Calendar Grid -->
      <div 
        v-for="(day, idx) in calendarDays" 
        :key="idx" 
        class="calendar-day min-h-[100px] p-2 rounded-xl border border-white/5 transition-all"
        :class="{ 
          'bg-white/[0.02]': day.isCurrentMonth, 
          'opacity-30': !day.isCurrentMonth,
          'border-blue-500/30 bg-blue-500/5': day.isToday
        }"
      >
        <div class="flex items-center justify-between mb-2">
          <span class="text-[10px] font-black" :class="day.isToday ? 'text-blue-400' : 'text-gray-500'">
            {{ day.date.getDate() }}
          </span>
          <div v-if="day.isToday" class="w-1 h-1 rounded-full bg-blue-500 shadow-[0_0_5px_#3b82f6]"></div>
        </div>

        <div class="space-y-1">
          <div 
            v-for="record in day.records" 
            :key="record._id" 
            class="record-chip p-1.5 rounded-lg border flex flex-col gap-1 cursor-pointer hover:scale-[1.02] transition-transform"
            :class="getRecordStyle(record)"
            @click="$emit('select-record', record)"
          >
            <div class="flex items-center justify-between">
              <component :is="getPlatformIcon(record.platform)" theme="filled" size="8" />
              <span class="text-[8px] font-black uppercase tracking-tighter opacity-70">
                {{ formatTime(record.scheduledAt || record.publishedAt || record.createdAt) }}
              </span>
            </div>
            <div class="text-[9px] font-bold truncate leading-tight">{{ record.metadata.title }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useI18n } from 'vue-i18n';
import { Left, Right, Tiktok, Youtube, Facebook, ShareTwo } from '@icon-park/vue-next';

const props = defineProps<{
  records: any[]
}>();

defineEmits(['select-record']);

const weekDayKeys = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const currentMonth = ref(new Date());

const { locale } = useI18n();

const formatMonth = (date: Date) => {
  return date.toLocaleString(locale.value, { month: 'long', year: 'numeric' });
};

const formatTime = (date: string | Date) => {
  return new Date(date).toLocaleTimeString(locale.value, { hour: '2-digit', minute: '2-digit', hour12: false });
};

const prevMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() - 1, 1);
};

const nextMonth = () => {
  currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
};

const calendarDays = computed(() => {
  const year = currentMonth.value.getFullYear();
  const month = currentMonth.value.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();
  
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Buffer days from prev month
  const prevLastDate = new Date(year, month, 0).getDate();
  for (let i = firstDay - 1; i >= 0; i--) {
    const d = new Date(year, month - 1, prevLastDate - i);
    days.push({ date: d, isCurrentMonth: false, isToday: false, records: findRecords(d) });
  }

  // Current month days
  for (let i = 1; i <= lastDate; i++) {
    const d = new Date(year, month, i);
    const isToday = d.getTime() === today.getTime();
    days.push({ date: d, isCurrentMonth: true, isToday, records: findRecords(d) });
  }

  // Buffer days from next month
  const remainingCells = 42 - days.length;
  for (let i = 1; i <= remainingCells; i++) {
    const d = new Date(year, month + 1, i);
    days.push({ date: d, isCurrentMonth: false, isToday: false, records: findRecords(d) });
  }

  return days;
});

const findRecords = (date: Date) => {
  const dateStr = date.toISOString().split('T')[0];
  return props.records.filter(r => {
    const rDate = new Date(r.scheduledAt || r.publishedAt || r.createdAt);
    return rDate.toISOString().split('T')[0] === dateStr;
  });
};

const getRecordStyle = (record: any) => {
  if (record.status === 'scheduled') return 'bg-purple-500/10 border-purple-500/20 text-purple-400';
  if (record.status === 'success') return 'bg-green-500/10 border-green-500/20 text-green-400';
  if (record.status === 'failed') return 'bg-red-500/10 border-red-500/20 text-red-400';
  return 'bg-blue-500/10 border-blue-500/20 text-blue-400';
};

const getPlatformIcon = (platform: string) => {
  switch (platform.toLowerCase()) {
    case 'tiktok': return Tiktok;
    case 'youtube': return Youtube;
    case 'facebook': return Facebook;
    default: return ShareTwo;
  }
};
</script>

<style scoped>
.calendar-day {
  background: rgba(20, 20, 25, 0.4);
  backdrop-filter: blur(8px);
}

.calendar-day:hover {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.1);
}

.record-chip {
  max-width: 100%;
}
</style>
