import {
  Box,
  VStack,
  HStack,
  Text,
  Button,
  Icon,
  useColorModeValue,
  Flex,
} from '@chakra-ui/react';
import { FiFileText, FiInbox, FiX, FiClock, FiFile } from 'react-icons/fi';

interface PrintQueueProps {
  queue?: { length: number; jobs: Array<{ id: string; document: string; pages: number }> };
  onCancelJob: (jobId: string) => void;
}

export default function PrintQueue({ queue, onCancelJob }: PrintQueueProps) {
  const borderColor = useColorModeValue('borderLight.default', 'border.default');
  const cardBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
  const headerBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
  const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');
  const hoverBg = useColorModeValue('canvasLight.subtle', 'canvas.default');

  const jobs = queue?.jobs || [];
  const jobCount = queue?.length || 0;

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
        <Flex justify="space-between" align="center">
          <HStack spacing={2}>
            <Icon as={FiFileText} boxSize={4} color={mutedText} />
            <Text fontWeight="semibold" fontSize="sm">Print Queue</Text>
          </HStack>
          <Box
            px={2}
            py={0.5}
            borderRadius="full"
            bg={jobCount > 0 ? 'accent.subtle' : useColorModeValue('canvasLight.inset', 'canvas.inset')}
            border="1px solid"
            borderColor={jobCount > 0 ? 'accent.muted' : borderColor}
          >
            <Text
              fontSize="xs"
              fontWeight="semibold"
              color={jobCount > 0 ? 'accent.fg' : mutedText}
            >
              {jobCount} {jobCount === 1 ? 'job' : 'jobs'}
            </Text>
          </Box>
        </Flex>
      </Box>

      {/* Jobs List */}
      <Box maxH="400px" overflowY="auto">
        {jobs.length === 0 ? (
          <VStack py={8} spacing={3}>
            <Box
              w={12}
              h={12}
              borderRadius="full"
              bg={useColorModeValue('canvasLight.inset', 'canvas.inset')}
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Icon as={FiInbox} boxSize={6} color={mutedText} />
            </Box>
            <Text fontSize="sm" color={mutedText} fontWeight="medium">
              No jobs in queue
            </Text>
            <Text fontSize="xs" color={useColorModeValue('fgLight.subtle', 'fg.subtle')}>
              Submit a print job to get started
            </Text>
          </VStack>
        ) : (
          <VStack spacing={0} align="stretch">
            {jobs.map((job, index) => (
              <Box
                key={job.id}
                px={4}
                py={3}
                borderBottom={index < jobs.length - 1 ? '1px solid' : 'none'}
                borderColor={borderColor}
                _hover={{ bg: hoverBg }}
                transition="background 0.1s ease"
              >
                <Flex justify="space-between" align="flex-start">
                  <HStack spacing={3} flex={1}>
                    <Box
                      w={8}
                      h={8}
                      borderRadius="md"
                      bg={useColorModeValue('accent.subtle', 'accent.subtle')}
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                    >
                      <Icon as={FiFile} boxSize={4} color="accent.fg" />
                    </Box>
                    <Box flex={1} minW={0}>
                      <Text
                        fontSize="sm"
                        fontWeight="semibold"
                        noOfLines={1}
                        title={job.document}
                      >
                        {job.document}
                      </Text>
                      <HStack spacing={3} mt={0.5}>
                        <HStack spacing={1}>
                          <Icon as={FiFileText} boxSize={3} color={mutedText} />
                          <Text fontSize="xs" color={mutedText}>
                            {job.pages} {job.pages === 1 ? 'page' : 'pages'}
                          </Text>
                        </HStack>
                        <HStack spacing={1}>
                          <Icon as={FiClock} boxSize={3} color={mutedText} />
                          <Text fontSize="xs" color={mutedText}>
                            Queued
                          </Text>
                        </HStack>
                      </HStack>
                    </Box>
                  </HStack>
                  <Button
                    size="sm"
                    variant="danger"
                    leftIcon={<Icon as={FiX} boxSize={3} />}
                    onClick={() => onCancelJob(job.id)}
                    aria-label={`Cancel print job ${job.document}`}
                  >
                    Cancel
                  </Button>
                </Flex>
              </Box>
            ))}
          </VStack>
        )}
      </Box>

      {/* Footer */}
      {jobs.length > 0 && (
        <Box px={4} py={2} borderTop="1px solid" borderColor={borderColor} bg={headerBg}>
          <HStack justify="space-between">
            <Text fontSize="xs" color={mutedText}>
              Total pages
            </Text>
            <Text fontSize="xs" fontWeight="medium">
              {jobs.reduce((acc, job) => acc + job.pages, 0)} pages
            </Text>
          </HStack>
        </Box>
      )}
    </Box>
  );
}
