import { Order } from '../../models/order.model.js';
import { User } from '../../models/user.model.js';
import { ServiceSubcategory } from '../../models/serviceSubcategory.model.js';
import { Address } from '../../models/address.model.js';

import { itemType } from '../../utils/enums/itemType.enum.js';

const subcategories = await ServiceSubcategory.find({
  select: ['id', 'name', 'type'],
});

const users = await User.find({ select: ['id', 'name', 'email', 'phoneNumber'] });
const addresses = await Address.find({
    select: [
        'id', 'country', 'city', 'district', 'street',
        'buildingNumber', 'floor', 'apartmentNumber', 'zone', 'landmarks'
    ]
    });
function formatAddress(address) {
    return [
      address.country,
      address.city,
      address.district,
      address.street,
      address.buildingNumber,
      address.floor,
      address.apartmentNumber,
      address.zone,
      address.landmarks
    ]
      .filter((val) => val != null && val !== '') // remove null/empty
      .join(', ');
  }

const orderResource = {
  resource: Order,
  options: {
    properties: {
       user: {
           isVisible: { list: true, filter: true, show: true, edit: true },
           availableValues: users.map((user) => {
               return { value: user, label: `${user.name} (${user.email})` };
         },
           ),
         },

      serviceSubcategory: {
        isVisible: { list: true, filter: true, show: true, edit: true },
        availableValues: subcategories.map((subcategory) => {
            return { value: subcategory, label: subcategory.name + (subcategory.type ? ` (${subcategory.type})` : '') };
        }),
      },

      // References: allow selecting existing
      fromAddress: {
        isVisible: { list: true, filter: true, show: true, edit: true },
        availableValues: addresses.map((address) => {
            return {
                value: address,
                label: formatAddress(address),  
            };
        }
        ),
      },
      toAddress: {
        isVisible: { list: true, filter: true, show: true, edit: true },
        availableValues: addresses.map((address) => {
            return {
                value: address,
                label: formatAddress(address),
            };
        }
        ),
      },
    },
    populate: ['user', 'serviceSubcategory', 'fromAddress', 'toAddress'], // ✅ Add this
    editProperties: [
        'user', 'serviceSubcategory',
        'fromAddress', 'toAddress',
        'pickUpDate', 'itemType', 'itemDescription', 'lifters', 'totalCost',
        'status'
    ],
    
    listProperties: [
        'id','createdAt', 'updatedAt', 'user', 'serviceSubcategory',
        'fromAddress', 'toAddress',
        'pickUpDate', 'itemType', 'itemDescription', 'lifters', 'totalCost',
        'status'
    ],
    
    showProperties: [
        'id', 'createdAt', 'updatedAt', 'user.id', 'serviceSubcategory',
        'fromAddress', 'toAddress',
        'pickUpDate', 'itemType', 'itemDescription', 'lifters', 'totalCost',
        'status'
    ],
    },
};
console.error('Order resource created successfully');
export default orderResource;
