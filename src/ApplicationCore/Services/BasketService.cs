using System.Collections.Generic;
using System.Threading.Tasks;
using Ardalis.GuardClauses;
using Ardalis.Result;
using Microsoft.eShopWeb.ApplicationCore.Entities.BasketAggregate;
using Microsoft.eShopWeb.ApplicationCore.Interfaces;
using Microsoft.eShopWeb.ApplicationCore.Specifications;

namespace Microsoft.eShopWeb.ApplicationCore.Services;

public class BasketService : IBasketService
{
    private readonly IRepository<Basket> _basketRepository;
    private readonly IAppLogger<BasketService> _logger;

    public BasketService(IRepository<Basket> basketRepository,
        IAppLogger<BasketService> logger)
    {
        _basketRepository = basketRepository;
        _logger = logger;
    }

    public async Task<Basket> AddItemToBasket(string username, int catalogItemId, decimal price, int quantity = 1)
    {
        var basket = await GetOrCreateBasketAsync(username);

        basket.AddItem(catalogItemId, price, quantity);

        await _basketRepository.UpdateAsync(basket);
        return basket;
    }

    public async Task DeleteBasketAsync(int basketId)
    {
        var basket = await _basketRepository.GetByIdAsync(basketId);
        Guard.Against.Null(basket);
        await _basketRepository.DeleteAsync(basket);
    }

    public async Task<Result<Basket>> SetQuantities(int basketId, Dictionary<string, int> quantities)
    {
        var basketSpec = new BasketWithItemsSpecification(basketId);
        var basket = await _basketRepository.FirstOrDefaultAsync(basketSpec);
        if (basket == null) return Result<Basket>.NotFound();

        foreach (var item in basket.Items)
        {
            if (quantities.TryGetValue(item.Id.ToString(), out var quantity))
            {
                _logger?.LogInformation("Updating quantity of item ID:{id} to {quantity}.", item.Id, quantity);
                item.SetQuantity(quantity);
            }
        }
        basket.RemoveEmptyItems();
        await _basketRepository.UpdateAsync(basket);
        return basket;
    }

    public async Task TransferBasketAsync(string anonymousId, string userName)
    {
        if (anonymousId == userName) return;

        var anonymousBasketSpec = new BasketWithItemsSpecification(anonymousId);
        var anonymousBasket = await _basketRepository.FirstOrDefaultAsync(anonymousBasketSpec);
        if (anonymousBasket == null) return;
        var userBasket = await GetOrCreateBasketAsync(userName);
        foreach (var item in anonymousBasket.Items)
        {
            userBasket.AddItem(item.CatalogItemId, item.UnitPrice, item.Quantity);
        }
        await _basketRepository.UpdateAsync(userBasket);
        await _basketRepository.DeleteAsync(anonymousBasket);
    }

    private async Task<Basket> GetOrCreateBasketAsync(string buyerId)
    {
        var specification = new BasketWithItemsSpecification(buyerId);
        var basket = await _basketRepository.FirstOrDefaultAsync(specification);
        if (basket != null) return basket;

        basket = new Basket(buyerId);
        await _basketRepository.AddAsync(basket);
        return basket;
    }
}
