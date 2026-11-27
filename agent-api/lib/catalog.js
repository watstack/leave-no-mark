// What Leave No Mark offers, in machine-readable form. This mirrors the quote
// form on index.html. If you change the form's options, change them here too.

export const BUSINESS = {
  name: 'Leave No Mark',
  description:
    'Window cleaning for homes, shopfronts and cafés in Brunswick (Melbourne, VIC) and surrounding suburbs, plus gutter cleans.',
  website: 'https://leavenomark.org',
  owner: 'Mark',
  phone: '0412 564 110',
  phone_e164: '+61412564110',
  email: 'leavenomark@outlook.com',
  service_area: 'Brunswick and surrounding suburbs, Melbourne, VIC, Australia',
  availability: 'Weekdays',
  pricing:
    'Prices are not fixed. Mark looks at each request and replies with a free, no-obligation price, usually by phone or text, or by email if no phone number is given.',
  offer: '10% off the first shopfront or café clean',
};

export const SERVICES = {
  windows: 'Window cleaning for homes (single storey; some double storey, case by case)',
  gutters: 'Gutter cleaning',
  shopfront: 'Shopfront or café windows, regular or one-off',
  not_sure: 'Customer is not sure yet; Mark will follow up',
};

export const OPTIONS = {
  'windows.sides': {
    inside_and_outside: 'Inside & outside',
    outside_only: 'Outside only',
    inside_only: 'Inside only',
  },
  'windows.extras': {
    frames_and_sills: 'Frames & sills',
    fly_screens: 'Fly screens',
    tracks: 'Tracks',
    glass_doors_and_balustrades: 'Glass doors & balustrades',
  },
  'gutters.gutter_guard': { yes: 'Yes', no: 'No', not_sure: 'Not sure' },
  'shopfront.frequency': {
    weekly: 'Weekly',
    fortnightly: 'Fortnightly',
    monthly: 'Monthly',
    one_off: 'One-off',
  },
  property: {
    single_storey: 'Single storey',
    double_storey: 'Double storey',
    shop_or_cafe: 'Shop or café',
  },
  timing: { asap: 'ASAP', this_month: 'This month', flexible: 'Flexible' },
};
