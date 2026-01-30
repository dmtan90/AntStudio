import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Dimensions } from 'react-native';
import { analyticsDataService, OverviewStats, StreamHealth } from '../../services/AnalyticsService';

const { width } = Dimensions.get('window');

const StatCard = ({ title, value, subtitle }: { title: string, value: string | number, subtitle?: string }) => (
    <View className="bg-gray-800 p-4 rounded-lg w-[48%] mb-4">
        <Text className="text-gray-400 text-xs mb-1 uppercase tracking-wider">{title}</Text>
        <Text className="text-white text-2xl font-bold">{value}</Text>
        {subtitle && <Text className="text-green-400 text-xs mt-1">{subtitle}</Text>}
    </View>
);

const HealthIndicator = ({ label, value, status }: { label: string, value: string, status?: string }) => (
    <View className="flex-row justify-between items-center mb-2">
        <Text className="text-gray-400">{label}</Text>
        <Text className={`font-bold ${status === 'poor' ? 'text-red-500' : 'text-white'}`}>{value}</Text>
    </View>
);

export const AnalyticsDashboardScreen = () => {
    const [overview, setOverview] = useState<OverviewStats | null>(null);
    const [health, setHealth] = useState<StreamHealth | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = useCallback(async () => {
        try {
            const [overviewData, healthData] = await Promise.all([
                analyticsDataService.getOverview(),
                analyticsDataService.getStreamHealth()
            ]);
            setOverview(overviewData);
            setHealth(healthData);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const onRefresh = () => {
        setRefreshing(true);
        loadData();
    };

    if (loading) {
        return (
            <View className="flex-1 bg-black justify-center items-center">
                <ActivityIndicator size="large" color="#fff" />
            </View>
        );
    }

    return (
        <ScrollView
            className="flex-1 bg-black p-4"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
        >
            <Text className="text-white text-2xl font-bold mb-6">Analytics Dashboard</Text>

            {/* Overview Section */}
            <View className="mb-6">
                <Text className="text-white text-lg font-bold mb-4">Overview</Text>
                <View className="flex-row flex-wrap justify-between">
                    <StatCard title="Total Views" value={overview?.totalViews?.toLocaleString() || 0} subtitle="+12% vs last week" />
                    <StatCard title="Watch Time" value={`${overview?.watchTimeHours || 0}h`} subtitle="+5% vs last week" />
                    <StatCard title="Published Projects" value={overview?.projects?.published || 0} />
                    <StatCard title="Total Likes" value={overview?.totalLikes?.toLocaleString() || 0} />
                </View>
            </View>

            {/* Stream Health Section (Simulating Charts) */}
            <View className="bg-gray-900 p-5 rounded-lg mb-6">
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-white text-lg font-bold">Stream Health</Text>
                    <View className={`px-2 py-1 rounded ${health?.status === 'excellent' ? 'bg-green-900' : 'bg-yellow-900'}`}>
                        <Text className={`text-xs ${health?.status === 'excellent' ? 'text-green-400' : 'text-yellow-400'} uppercase font-bold`}>
                            {health?.status || 'Offline'}
                        </Text>
                    </View>
                </View>

                <HealthIndicator label="Bitrate" value={`${health?.bitrate || 0} kbps`} />
                <HealthIndicator label="Frame Rate" value={`${health?.fps || 0} fps`} />
                <HealthIndicator label="Latency" value={`${health?.latency || 0} s`} />
                <HealthIndicator label="CPU Usage" value={`${health?.cpuUsage || 0}%`} />
                <HealthIndicator label="Active Viewers" value={`${health?.viewers || 0}`} />

                {/* Visual Bar for Bitrate consistency (Simulated) */}
                <View className="mt-4">
                    <Text className="text-gray-500 text-xs mb-2">Bitrate Stability (Last 60s)</Text>
                    <View className="flex-row items-end h-16 gap-1">
                        {Array.from({ length: 20 }).map((_, i) => {
                            const height = 20 + Math.random() * 80; // random height %
                            return (
                                <View
                                    key={i}
                                    style={{ height: `${height}%`, width: `${100 / 20}%` }}
                                    className="bg-blue-600 opacity-60 rounded-t-sm"
                                />
                            );
                        })}
                    </View>
                </View>
            </View>

            {/* Recent Activity */}
            <View className="mb-8">
                <Text className="text-white text-lg font-bold mb-4">Recent Activity</Text>
                {overview?.recentActivity?.map((activity, index) => (
                    <View key={index} className="flex-row items-center bg-gray-900 p-3 mb-2 rounded border-l-4 border-purple-500">
                        <View className="flex-1">
                            <Text className="text-white font-medium">New {activity.type} on {activity.project}</Text>
                            <Text className="text-gray-500 text-xs">{activity.time}</Text>
                        </View>
                    </View>
                ))}
            </View>

            <View className="h-10" />
        </ScrollView>
    );
};
