import { useEffect, useState } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  useColorModeValue,
  Collapse,
  Spinner,
  Badge,
  Tooltip,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Button,
} from '@chakra-ui/react';
import {
  FiPrinter,
  FiHome,
  FiFileText,
  FiActivity,
  FiChevronDown,
  FiChevronRight,
  FiPlus,
  FiRefreshCw,
  FiMapPin,
  FiStar,
  FiEye,
} from 'react-icons/fi';
import { api, PrinterInstance, PrinterLocation, PrintersResponse } from '../api';

interface SidebarProps {
  currentPrinter?: string;
  onNavigate: (section: string) => void;
  selectedPrinterId?: string;
  onSelectPrinter?: (printerId: string) => void;
  currentLocationId?: string;
  onSelectLocation?: (locationId: string) => void;
}

export default function Sidebar({
  currentPrinter,
  onNavigate,
  selectedPrinterId,
  onSelectPrinter,
  currentLocationId,
  onSelectLocation,
}: SidebarProps) {
  const [printersData, setPrintersData] = useState<PrintersResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedLocations, setExpandedLocations] = useState<Record<string, boolean>>({
    'loc-office': true,
    'loc-home': true,
  });

  const borderColor = useColorModeValue('borderLight.default', 'border.default');
  const sidebarBg = useColorModeValue('canvasLight.default', 'canvas.subtle');
  const hoverBg = useColorModeValue('canvasLight.subtle', 'canvas.default');
  const selectedBg = useColorModeValue('accent.subtle', 'accent.subtle');
  const currentLocationBg = useColorModeValue('success.subtle', 'success.subtle');
  const mutedText = useColorModeValue('fgLight.muted', 'fg.muted');
  const menuButtonBg = useColorModeValue('white', 'canvas.default');
  const badgeCountBg = useColorModeValue('canvasLight.inset', 'canvas.inset');

  const loadPrinters = async () => {
    setLoading(true);
    try {
      const data = await api.getPrinters();
      setPrintersData(data);
    } catch (error) {
      console.error('Failed to load printers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrinters();
  }, []);

  const toggleLocation = (locationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedLocations(prev => ({
      ...prev,
      [locationId]: !prev[locationId],
    }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'printing':
        return 'accent';
      case 'error':
        return 'danger';
      case 'paused':
      case 'warming_up':
        return 'attention';
      default:
        return 'fg';
    }
  };

  const getInkSystemIcon = (inkSystem?: string) => {
    switch (inkSystem) {
      case 'toner':
        return '⚡';
      case 'tank':
        return '🛢️';
      default:
        return '🖨️';
    }
  };

  // Get current location details
  const currentLocation = printersData?.locations.find(l => l.id === currentLocationId);
  
  // Get the default printer for current location
  const getDefaultPrinterForLocation = (locationId: string) => {
    const location = printersData?.locations.find(l => l.id === locationId);
    if (location?.default_printer_id) {
      return location.default_printer_id;
    }
    // Fall back to first printer in location
    const locationPrinters = printersData?.printersByLocation[locationId];
    return locationPrinters?.[0]?.id;
  };

  // Check if currently viewing a printer from a different location
  const viewedPrinter = printersData?.printers.find(p => p.id === selectedPrinterId);
  const isViewingRemote = viewedPrinter && viewedPrinter.locationId !== currentLocationId;

  return (
    <Box
      w="280px"
      minW="280px"
      h="calc(100vh - 100px)"
      bg={sidebarBg}
      borderRight="1px solid"
      borderColor={borderColor}
      overflowY="auto"
      display="flex"
      flexDirection="column"
    >
      {/* Location Selector */}
      <Box px={3} py={3} borderBottom="1px solid" borderColor={borderColor} bg={currentLocationBg}>
        <HStack spacing={2} mb={2}>
          <Icon as={FiMapPin} boxSize={4} color="success.fg" />
          <Text fontSize="xs" fontWeight="semibold" color="success.fg" textTransform="uppercase">
            My Location
          </Text>
        </HStack>
        <Menu>
          <MenuButton
            as={Button}
            size="sm"
            w="100%"
            variant="outline"
            rightIcon={<FiChevronDown />}
            textAlign="left"
            fontWeight="medium"
            bg={menuButtonBg}
          >
            <HStack spacing={2}>
              <Text fontSize="lg">{currentLocation?.icon || '📍'}</Text>
              <Text>{currentLocation?.name || 'Select Location'}</Text>
            </HStack>
          </MenuButton>
          <MenuList>
            {printersData?.locations.map(location => (
              <MenuItem
                key={location.id}
                onClick={() => onSelectLocation?.(location.id)}
                icon={<Text fontSize="lg">{location.icon}</Text>}
                bg={location.id === currentLocationId ? 'success.subtle' : undefined}
              >
                <HStack justify="space-between" w="100%">
                  <Text>{location.name}</Text>
                  {location.id === currentLocationId && (
                    <Badge colorScheme="green" fontSize="xs">Current</Badge>
                  )}
                </HStack>
              </MenuItem>
            ))}
          </MenuList>
        </Menu>
        {currentLocation && (
          <Text fontSize="xs" color={mutedText} mt={2}>
            Default printer: {
              printersData?.printers.find(p => p.id === getDefaultPrinterForLocation(currentLocationId!))?.name || 'None'
            }
          </Text>
        )}
      </Box>

      {/* Remote Viewing Indicator */}
      {isViewingRemote && viewedPrinter && (
        <Box px={3} py={2} bg="attention.subtle" borderBottom="1px solid" borderColor="attention.muted">
          <HStack spacing={2}>
            <Icon as={FiEye} boxSize={3} color="attention.fg" />
            <Text fontSize="xs" color="attention.fg">
              Viewing: {viewedPrinter.name}
              {viewedPrinter.locationId && (
                <> ({printersData?.locations.find(l => l.id === viewedPrinter.locationId)?.name})</>
              )}
            </Text>
          </HStack>
        </Box>
      )}

      {/* Printers Header */}
      <Box px={3} py={3} borderBottom="1px solid" borderColor={borderColor}>
        <HStack justify="space-between">
          <Text fontSize="xs" fontWeight="semibold" color={mutedText} textTransform="uppercase">
            Printers
          </Text>
          <HStack spacing={1}>
            <Tooltip label="Refresh printers">
              <IconButton
                aria-label="Refresh"
                icon={<Icon as={FiRefreshCw} boxSize={3} />}
                size="xs"
                variant="ghost"
                onClick={loadPrinters}
                isLoading={loading}
              />
            </Tooltip>
            <Tooltip label="Add printer">
              <IconButton
                aria-label="Add printer"
                icon={<Icon as={FiPlus} boxSize={3} />}
                size="xs"
                variant="ghost"
              />
            </Tooltip>
          </HStack>
        </HStack>
      </Box>

      {/* Printer Tree */}
      <VStack spacing={0} align="stretch" py={2} flex={1} overflowY="auto">
        {loading && !printersData ? (
          <Box p={4} textAlign="center">
            <Spinner size="sm" color="accent.fg" />
            <Text fontSize="xs" color={mutedText} mt={2}>
              Loading printers...
            </Text>
          </Box>
        ) : printersData && printersData.locations.length > 0 ? (
          <>
            {/* Locations with printers */}
            {printersData.locations.map(location => {
              const locationPrinters = printersData.printersByLocation[location.id] || [];
              const isExpanded = expandedLocations[location.id] !== false;
              const isCurrentLocation = location.id === currentLocationId;
              const defaultPrinterId = getDefaultPrinterForLocation(location.id);

              return (
                <Box key={location.id}>
                  {/* Location Header */}
                  <HStack
                    px={3}
                    py={2}
                    cursor="pointer"
                    bg={isCurrentLocation ? 'success.subtle' : 'transparent'}
                    _hover={{ bg: isCurrentLocation ? 'success.subtle' : hoverBg }}
                    onClick={(e) => toggleLocation(location.id, e)}
                    transition="background 0.1s"
                    borderLeft={isCurrentLocation ? "3px solid" : "3px solid transparent"}
                    borderColor={isCurrentLocation ? "success.fg" : "transparent"}
                  >
                    <Icon
                      as={isExpanded ? FiChevronDown : FiChevronRight}
                      boxSize={3}
                      color={mutedText}
                    />
                    <Text fontSize="lg">{location.icon}</Text>
                    <Text fontSize="sm" fontWeight="semibold" flex={1}>
                      {location.name}
                    </Text>
                    {isCurrentLocation && (
                      <Tooltip label="You are here">
                        <Badge colorScheme="green" fontSize="xs" px={1}>
                          📍
                        </Badge>
                      </Tooltip>
                    )}
                    <Badge
                      px={1.5}
                      py={0.5}
                      borderRadius="full"
                      bg={badgeCountBg}
                      color={mutedText}
                      fontSize="xs"
                    >
                      {locationPrinters.length}
                    </Badge>
                  </HStack>

                  {/* Printers in Location */}
                  <Collapse in={isExpanded}>
                    <VStack spacing={0} align="stretch" pl={4}>
                      {locationPrinters.map(printer => {
                        const statusColor = getStatusColor(printer.status);
                        const isSelected = printer.id === selectedPrinterId;
                        const isDefaultPrinter = printer.id === defaultPrinterId && isCurrentLocation;

                        return (
                          <HStack
                            key={printer.id}
                            px={3}
                            py={2}
                            cursor="pointer"
                            bg={isSelected ? selectedBg : 'transparent'}
                            _hover={{ bg: isSelected ? selectedBg : hoverBg }}
                            onClick={() => onSelectPrinter?.(printer.id)}
                            transition="background 0.1s"
                            borderLeft="2px solid"
                            borderColor={isSelected ? 'accent.fg' : 'transparent'}
                          >
                            <Text fontSize="sm">
                              {getInkSystemIcon(printer.type?.inkSystem)}
                            </Text>
                            <Box flex={1} minW={0}>
                              <HStack spacing={1}>
                                <Text fontSize="sm" fontWeight="medium" noOfLines={1}>
                                  {printer.name}
                                </Text>
                                {isDefaultPrinter && (
                                  <Tooltip label="Default printer for this location">
                                    <Box color="attention.fg">
                                      <Icon as={FiStar} boxSize={3} />
                                    </Box>
                                  </Tooltip>
                                )}
                              </HStack>
                              <Text fontSize="xs" color={mutedText} noOfLines={1}>
                                {printer.type?.model || printer.typeId}
                              </Text>
                            </Box>
                            <Tooltip label={printer.status}>
                              <Box
                                w={2}
                                h={2}
                                borderRadius="full"
                                bg={`${statusColor}.fg`}
                                animation={printer.status === 'printing' ? 'pulse 2s infinite' : undefined}
                              />
                            </Tooltip>
                          </HStack>
                        );
                      })}

                      {locationPrinters.length === 0 && (
                        <Text fontSize="xs" color={mutedText} px={3} py={2} fontStyle="italic">
                          No printers in this location
                        </Text>
                      )}
                    </VStack>
                  </Collapse>
                </Box>
              );
            })}

            {/* Unassigned Printers */}
            {printersData.unassignedPrinters.length > 0 && (
              <Box>
                <HStack px={3} py={2}>
                  <Text fontSize="xs" color={mutedText} fontWeight="semibold" textTransform="uppercase">
                    Unassigned
                  </Text>
                </HStack>
                <VStack spacing={0} align="stretch">
                  {printersData.unassignedPrinters.map(printer => {
                    const statusColor = getStatusColor(printer.status);
                    const isSelected = printer.id === selectedPrinterId;

                    return (
                      <HStack
                        key={printer.id}
                        px={3}
                        py={2}
                        cursor="pointer"
                        bg={isSelected ? selectedBg : 'transparent'}
                        _hover={{ bg: isSelected ? selectedBg : hoverBg }}
                        onClick={() => onSelectPrinter?.(printer.id)}
                        transition="background 0.1s"
                      >
                        <Icon as={FiPrinter} boxSize={4} color={mutedText} />
                        <Text fontSize="sm" fontWeight="medium" flex={1} noOfLines={1}>
                          {printer.name}
                        </Text>
                        <Box
                          w={2}
                          h={2}
                          borderRadius="full"
                          bg={`${statusColor}.fg`}
                        />
                      </HStack>
                    );
                  })}
                </VStack>
              </Box>
            )}
          </>
        ) : (
          <Box p={4} textAlign="center">
            <Text fontSize="sm" color={mutedText}>
              No printers available
            </Text>
            <Text fontSize="xs" color={mutedText} mt={1}>
              Click + to add a printer
            </Text>
          </Box>
        )}
      </VStack>

      {/* Navigation */}
      <Box borderTop="1px solid" borderColor={borderColor}>
        <Box px={3} py={2}>
          <Text fontSize="xs" fontWeight="semibold" color={mutedText} textTransform="uppercase">
            Navigation
          </Text>
        </Box>
        <VStack spacing={0} align="stretch">
          <NavItem
            icon={FiHome}
            label="Dashboard"
            onClick={() => onNavigate('dashboard')}
            hoverBg={hoverBg}
            mutedText={mutedText}
          />
          <NavItem
            icon={FiFileText}
            label="Print Jobs"
            onClick={() => onNavigate('jobs')}
            hoverBg={hoverBg}
            mutedText={mutedText}
          />
          <NavItem
            icon={FiActivity}
            label="Activity Log"
            onClick={() => onNavigate('activity')}
            hoverBg={hoverBg}
            mutedText={mutedText}
          />
        </VStack>
      </Box>

      {/* Summary */}
      {printersData && (
        <Box
          px={3}
          py={3}
          borderTop="1px solid"
          borderColor={borderColor}
        >
          <HStack justify="space-between" fontSize="xs" color={mutedText}>
            <Text>{printersData.summary.printerCount} printers</Text>
            <Text>{printersData.summary.locationCount} locations</Text>
          </HStack>
        </Box>
      )}

      {/* CSS for pulse animation */}
      <style>
        {`
          @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
          }
        `}
      </style>
    </Box>
  );
}

function NavItem({
  icon,
  label,
  onClick,
  hoverBg,
  mutedText,
}: {
  icon: any;
  label: string;
  onClick: () => void;
  hoverBg: string;
  mutedText: string;
}) {
  return (
    <HStack
      px={3}
      py={2}
      cursor="pointer"
      _hover={{ bg: hoverBg }}
      onClick={onClick}
      transition="background 0.1s"
    >
      <Icon as={icon} boxSize={4} color={mutedText} />
      <Text fontSize="sm">{label}</Text>
    </HStack>
  );
}
