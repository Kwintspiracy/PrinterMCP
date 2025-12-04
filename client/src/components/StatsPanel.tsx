import {
  Box,
  SimpleGrid,
  Text,
  Icon,
  useColorModeValue,
  HStack,
  VStack,
  Flex,
} from '@chakra-ui/react';
import { FiFileText, FiCheckCircle, FiXCircle, FiTrendingUp, FiBarChart2 } from 'react-icons/fi';
import { Statistics } from '../api';

interface StatsPanelProps {
  stats: Statistics | null;
}

interface StatItemProps {
  label: string;
  value: string | number;
  icon: any;
  color: string;
}

function StatItem({ label, value, icon, color }: StatItemProps) {
  const borderColor = useColorModeValue('borderLight.default', 'border.default');
  const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');

  return (
    <Box py={3} borderBottom="1px solid" borderColor={borderColor}>
      <Flex justify="space-between" align="center">
        <HStack spacing={2}>
          <Icon as={icon} boxSize={4} color={color} />
          <Text fontSize="sm" color={mutedText}>{label}</Text>
        </HStack>
        <Text fontSize="lg" fontWeight="bold">{value}</Text>
      </Flex>
    </Box>
  );
}

export default function StatsPanel({ stats }: StatsPanelProps) {
  const borderColor = useColorModeValue('borderLight.default', 'border.default');
  const cardBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
  const headerBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
  const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');

  return (
    <Box
      border="1px solid"
      borderColor={borderColor}
      borderRadius="md"
      bg={cardBg}
      overflow="hidden"
    >
      {/* Header */}
      <Box px={4} py={3} borderBottom="1px solid" borderColor={borderColor} bg={headerBg}>
        <HStack spacing={2}>
          <Icon as={FiBarChart2} boxSize={4} color={mutedText} />
          <Text fontWeight="semibold" fontSize="sm">Statistics</Text>
        </HStack>
      </Box>

      {/* Stats List */}
      <Box px={4}>
        <StatItem
          label="Total Pages"
          value={stats?.totalPagesPrinted || 0}
          icon={FiFileText}
          color="accent.fg"
        />
        <StatItem
          label="Success Rate"
          value={`${stats?.successRate || 0}%`}
          icon={FiTrendingUp}
          color="success.fg"
        />
        <StatItem
          label="Completed Jobs"
          value={stats?.completedJobs || 0}
          icon={FiCheckCircle}
          color="success.fg"
        />
        <Box py={3}>
          <Flex justify="space-between" align="center">
            <HStack spacing={2}>
              <Icon as={FiXCircle} boxSize={4} color="danger.fg" />
              <Text fontSize="sm" color={mutedText}>Failed Jobs</Text>
            </HStack>
            <Text fontSize="lg" fontWeight="bold" color={(stats?.failedJobs || 0) > 0 ? 'danger.fg' : undefined}>
              {stats?.failedJobs || 0}
            </Text>
          </Flex>
        </Box>
      </Box>

      {/* Summary Footer */}
      <Box px={4} py={2} borderTop="1px solid" borderColor={borderColor} bg={headerBg}>
        <HStack justify="space-between">
          <Text fontSize="xs" color={mutedText}>
            All time stats
          </Text>
          <Text fontSize="xs" fontWeight="medium" color="success.fg">
            {stats?.successRate || 0}% success
          </Text>
        </HStack>
      </Box>
    </Box>
  );
}
