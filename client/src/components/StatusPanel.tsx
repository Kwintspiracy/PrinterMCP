import { Box, Heading, VStack, HStack, Text, Progress, Alert, AlertIcon, AlertTitle, AlertDescription, Badge, Card, CardBody, useColorModeValue, Icon } from '@chakra-ui/react';
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons';
import { PrinterStatus } from '../api';

interface StatusPanelProps {
  status: PrinterStatus | null;
}

export default function StatusPanel({ status }: StatusPanelProps) {
  const cardBg = useColorModeValue('white', 'gray.800');
  const jobBg = useColorModeValue('blue.50', 'blue.900');
  const jobBorder = useColorModeValue('blue.500', 'blue.300');

  if (!status) {
    return (
      <Card>
        <CardBody>
          <Heading size="md" mb={4} bgGradient="linear(to-r, brand.500, accent.500)" bgClip="text">
            Printer Status
          </Heading>
          <Text color="gray.500">Loading...</Text>
        </CardBody>
      </Card>
    );
  }

  const getOperationalColor = (opStatus: string) => {
    switch (opStatus) {
      case 'ready':
        return 'green';
      case 'not_ready':
        return 'orange';
      case 'error':
        return 'red';
      default:
        return 'gray';
    }
  };

  const currentJob = status.currentJob;
  const progress = currentJob?.progress ? parseFloat(String(currentJob.progress)) : 0;

  return (
    <Card>
      <CardBody>
        <Heading size="md" mb={6} fontWeight="600" letterSpacing="-0.5px">
          Printer Status
        </Heading>

        <VStack align="stretch" spacing={4}>
          <HStack justify="space-between" p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
            <Text fontWeight="600" fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>Printer State</Text>
            <Text textTransform="capitalize" fontWeight="600" fontSize="sm">{status.status.replace('_', ' ')}</Text>
          </HStack>

          <HStack justify="space-between" p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
            <Text fontWeight="600" fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>Operational Status</Text>
            <Badge
              colorScheme={getOperationalColor(status.operationalStatus)}
              fontSize="sm"
              px={3}
              py={1}
              borderRadius="full"
              fontWeight="600"
            >
              {status.operationalStatus.replace('_', ' ').toUpperCase()}
            </Badge>
          </HStack>

          <HStack justify="space-between" p={3} bg={useColorModeValue('gray.50', 'gray.700')} borderRadius="lg">
            <Text fontWeight="600" fontSize="sm" color={useColorModeValue('gray.700', 'gray.300')}>Can Print</Text>
            <HStack spacing={2}>
              <Icon
                as={status.canPrint ? CheckCircleIcon : WarningIcon}
                color={status.canPrint ? 'green.500' : 'red.500'}
                boxSize={5}
              />
              <Badge
                colorScheme={status.canPrint ? 'green' : 'red'}
                fontSize="sm"
                px={3}
                py={1}
                borderRadius="full"
                fontWeight="600"
              >
                {status.canPrint ? 'YES' : 'NO'}
              </Badge>
            </HStack>
          </HStack>
        </VStack>

        {status.issues && status.issues.length > 0 && (
          <Alert status="warning" mt={4} borderRadius="lg" variant="left-accent">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle fontWeight="bold">Issues Detected</AlertTitle>
              <VStack align="stretch" spacing={1} mt={2}>
                {status.issues.map((issue, i) => (
                  <AlertDescription key={i} fontSize="sm">
                    • {issue}
                  </AlertDescription>
                ))}
              </VStack>
            </Box>
          </Alert>
        )}

        {currentJob && (
          <Box
            mt={4}
            p={4}
            bg={jobBg}
            borderRadius="lg"
            borderLeft="4px"
            borderColor={jobBorder}
            role="region"
            aria-label="Current print job"
          >
            <Heading size="sm" mb={3} fontWeight="bold">Current Job</Heading>
            <Text fontSize="sm" mb={1}><strong>Document:</strong> {currentJob.document}</Text>
            <Text fontSize="sm" mb={3}><strong>Progress:</strong> {currentJob.progress}</Text>
            <Progress
              value={progress}
              size="md"
              colorScheme="blue"
              borderRadius="full"
              hasStripe
              isAnimated
              aria-label={`Print progress: ${progress}%`}
            />
          </Box>
        )}

        {status.errors.length > 0 && (
          <Alert status="error" mt={4} borderRadius="lg" variant="left-accent">
            <AlertIcon />
            <Box flex="1">
              <AlertTitle fontWeight="bold">Errors</AlertTitle>
              <VStack align="stretch" spacing={1} mt={2}>
                {status.errors.map((error, i) => (
                  <AlertDescription key={i} fontSize="sm">
                    <strong>{error.type}:</strong> {error.message}
                  </AlertDescription>
                ))}
              </VStack>
            </Box>
          </Alert>
        )}
      </CardBody>
    </Card>
  );
}
