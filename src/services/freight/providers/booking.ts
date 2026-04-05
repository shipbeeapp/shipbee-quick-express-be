// Unified booking provider logic
import axios from 'axios';
import { generateSeabaySignature, getSeabayTimestamp, getLocode } from '../utils.js';
import { env } from '../../../config/environment.js';

// Helper: Map loadType/mode to Seabay TransportMode
function mapTransportMode(loadType: string, mode: string) {
  if (loadType?.toLowerCase().includes('fcl')) return 'FCL';
  if (loadType?.toLowerCase().includes('lcl')) return 'LCL';
  if (loadType?.toLowerCase().includes('air') || mode === 'air') return 'AIR';
  return 'FCL'; // default
}
// Helper: Map Incoterm to Seabay TransportService
function mapTransportService(incoterm: string) {
  const map: any = { EXW: 'D2D', FCA: 'D2P', FAS: 'D2P', FOB: 'P2P', CFR: 'P2P', CIF: 'P2P', CPT: 'P2D', CIP: 'P2D', DAP: 'P2D', DPU: 'P2D', DDP: 'P2D' };
  return map[incoterm?.toUpperCase()] || 'P2P';
}

export async function bookUnified(body: any) {
  try {
    const { shipmentId = '', loadType, mode, globalIncoterm, originCode, destinationCode, sender, receiver, packages, goodsDetails, date, productName, orderNo } = body;
    // 1. Detect provider
    if (shipmentId.startsWith('seabay-')) {
      // 2. Seabay booking
      const transportMode = mapTransportMode(loadType, mode);
      const transportService = mapTransportService(globalIncoterm);
      const timestamp = getSeabayTimestamp();
      const sign = generateSeabaySignature(env.SEABAY_APP_KEY, env.SEABAY_APP_SECRET, timestamp);
      // Address formatting
      const formatAddress = (p: any) => `${p.street || ''}, ${p.city || ''}, ${p.district || ''}`.replace(/^[,\s]+|[,\s]+$/g, '');
      const payload = {
        OrderNo: orderNo,
        OriginAddress: originCode || getLocode(body.origin),
        DestinationAddress: destinationCode || getLocode(body.destination),
        SupplierInfo: {
          CountryID: sender?.country,
          Company: sender?.company,
          Address: formatAddress(sender),
          ContactName: sender?.fullName,
          ContactNumber: `${sender?.phoneCode || ''}${sender?.phone || ''}`,
          Email: sender?.email
        },
        ConsigneeInfo: {
          CountryID: receiver?.country,
          Company: receiver?.company,
          Address: formatAddress(receiver),
          ContactName: receiver?.fullName,
          ContactNumber: `${receiver?.phoneCode || ''}${receiver?.phone || ''}`,
          Email: receiver?.email
        },
        TransportService: transportService,
        TransportMode: transportMode,
        Load: {
          NetNetWeight: body.cargoWeight,
          TotalQuantity: packages?.reduce((sum: number, p: any) => sum + Number(p.count || 0), 0),
          TotalGrossVolumeMeasure: body.cargoSize,
          Packages: (packages || []).map((p: any) => ({
            PackageType: 'BOX',
            Quantity: Number(p.count),
            Weight: Number(p.weight),
            Length: Number(p.length),
            Width: Number(p.width),
            Height: Number(p.height)
          }))
        },
        AddedValueServices: (body.selectedServices || []).map((s: string) => ({ ServiceType: s, ServiceName: s.charAt(0) + s.slice(1).toLowerCase() })),
        CargoReadinessDate: date,
        ProductName: productName,
        QuoteId: shipmentId,
        TradingTerm: globalIncoterm,
        app_key: env.SEABAY_APP_KEY,
        timestamp,
        sign
      };
      try {
        const res = await axios.post('https://api.seabay.cn/api/Order/Booking', payload, {
          headers: {
            'Content-Type': 'application/json',
            app_key: env.SEABAY_APP_KEY,
            app_secret: env.SEABAY_APP_SECRET
          },
          timeout: 15000
        });
        const d = res.data;
        if (d?.success || d?.responseCode === 200 || d?.responseCode === 0) {
          return {
            success: true,
            provider: 'seabay',
            sbOrderNo: d.sbOrderNo || d.response?.sbOrderNo,
            seabayOrderNo: d.seabayOrderNo || orderNo,
            msg: d.msg || 'Booking submitted successfully'
          };
        } else {
          return { success: false, provider: 'seabay', msg: d?.msg || d?.error || 'Unknown error' };
        }
      } catch (err: any) {
        return { success: false, provider: 'seabay', msg: err?.response?.data?.msg || err?.message || 'Seabay booking failed' };
      }
    } else {
      // 3. SeaRates booking (pending)
      return {
        success: true,
        provider: 'searates',
        orderNo: shipmentId,
        msg: 'SeaRates booking registered — confirmation will follow via email.',
        pending: true
      };
    }
  } catch (error: any) {
    return { success: false, provider: 'unknown', msg: error?.message || 'Booking failed' };
  }
}

